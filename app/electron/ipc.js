/***********************************************************************************************************************
 *  OpenStudio(R), Copyright (c) 2008-2020, Alliance for Sustainable Energy, LLC. All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 *  following conditions are met:
 *
 *  (1) Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 *  disclaimer.
 *
 *  (2) Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 *  following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 *  (3) Neither the name of the copyright holder nor the names of any contributors may be used to endorse or promote
 *  products derived from this software without specific prior written permission from the respective party.
 *
 *  (4) Other than as required in clauses (1) and (2), distributions in any form of modifications or other derivative
 *  works may not use the "OpenStudio" trademark, "OS", "os", or any other confusingly similar designation without
 *  specific prior written permission from Alliance for Sustainable Energy, LLC.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 *  INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *  DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER, THE UNITED STATES GOVERNMENT, OR ANY CONTRIBUTORS BE LIABLE FOR
 *  ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 *  AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **********************************************************************************************************************/
// Main-process side of window.patBridge (see main_preload.js): explicit IPC channels instead of @electron/remote.

import { app, dialog, ipcMain, shell } from 'electron';
import fs from 'fs';
import path from 'path';

export default function registerIpc(mainWindow, env) {
  // Only the top frame of the main window may use these channels: not the reports/server webviews and not an iframe.
  // That frame only ever shows the app's page (background.js blocks navigation). Its URL is not checked here: it is
  // still empty when the preload's pat:app-info arrives before the first navigation has committed.
  const trusted = event => !mainWindow.isDestroyed() && event.sender === mainWindow.webContents &&
    !!event.senderFrame && event.senderFrame === mainWindow.webContents.mainFrame;
  const handle = (channel, fn) => ipcMain.handle(channel, (event, ...args) => {
    if (!trusted(event)) throw new Error(channel + ': untrusted sender');
    return fn(...args);
  });

  // Sync: read once by the preload, before any renderer script runs
  ipcMain.on('pat:app-info', event => {
    event.returnValue = trusted(event) ? {
      // In the test env the preload sends dialogs and openExternal to channels mocked by Playwright (playwright/App.ts)
      test: env.name === 'test',
      appPath: app.getAppPath(),
      paths: {
        userData: app.getPath('userData'),
        appData: app.getPath('appData'),
        temp: app.getPath('temp'),
        exe: app.getPath('exe')
      }
    } : null;
  });

  // Sync: read inside window.onbeforeunload. global.exitClicked is set in window.js when the window is closing.
  ipcMain.on('pat:exit-clicked', event => {
    event.returnValue = trusted(event) && global.exitClicked === true;
  });

  ipcMain.on('pat:quit', event => {
    if (trusted(event)) app.quit();
  });

  // No parent window, as before: with one the dialogs would become sheets on macOS
  handle('pat:dialog:showOpenDialog', options => dialog.showOpenDialog(options));
  handle('pat:dialog:showMessageBox', options => dialog.showMessageBox(options));

  handle('pat:shell:openExternal', url => {
    if (typeof url !== 'string' || !['http:', 'https:'].includes(new URL(url).protocol)) {
      throw new Error('pat:shell:openExternal: only http and https URLs are allowed');
    }
    return shell.openExternal(url);
  });
  // shell.openPath launches whatever it is given (applications, scripts), so only the two files
  // the app opens are allowed: a measure's measure.rb and a project's results.csv
  handle('pat:shell:openPath', file => {
    const fail = reason => {
      throw new Error('pat:shell:openPath: ' + reason);
    };
    if (typeof file !== 'string') fail('path must be a string');
    // UNC paths are allowed: projects can live on network shares, and the renderer still has Node access anyway
    if (!path.isAbsolute(file)) fail('path must be absolute');
    if (!['measure.rb', 'results.csv'].includes(path.basename(file))) fail('only measure.rb and results.csv can be opened');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail('no such file');
    return shell.openPath(file);
  });

  return trusted;
}
