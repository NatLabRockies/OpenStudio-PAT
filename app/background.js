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
// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app } from 'electron';
import createWindow from './electron/window';
import { getEnv } from './env';

const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Set by the Playwright launcher so test runs never steal focus from the developer's desktop.
const isHeadlessTest = process.env.HEADLESS_TEST === '1';

app.on('ready', () => {
  if (isHeadlessTest && process.platform === 'darwin') {
    app.dock.hide();
  }

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    show: !isHeadlessTest,
    webPreferences: {
      backgroundThrottling: !isHeadlessTest, // hidden windows otherwise throttle timers/animations
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: false // Disable the same-origin policy when using http
    }
  });
  remoteMain.enable(mainWindow.webContents);

  // CI smoke test: PAT_SMOKE_TEST=1 exits 0 once the AngularJS app has bootstrapped, 1 on load failure/crash/timeout.
  // Combine with HEADLESS_TEST=1 to run it locally without a visible window.
  if (process.env.PAT_SMOKE_TEST === '1') {
    const fail = reason => {
      console.error('PAT smoke test FAILED: ' + reason);
      app.exit(1);
    };
    const wc = mainWindow.webContents;
    // Only main-frame failures count; -3 is ERR_ABORTED (cancelled or redirected navigation)
    wc.on('did-fail-load', (event, code, description, url, isMainFrame) => {
      if (isMainFrame && code !== -3) fail('did-fail-load ' + code + ' ' + description);
    });
    wc.on('render-process-gone', (event, details) => fail('render-process-gone ' + details.reason));
    wc.on('did-finish-load', () => {
      setTimeout(() => {
        wc.executeJavaScript('typeof angular !== "undefined" && !!angular.element(document.body).injector()')
          .then(ok => {
            if (ok) {
              console.log('PAT smoke test passed');
              app.exit(0);
            } else {
              fail('AngularJS app did not bootstrap');
            }
          })
          .catch(err => fail(err.message));
      }, 5000);
    });
    setTimeout(() => fail('timeout'), 90000);
  }

  const env = getEnv(app.getAppPath());
  if (env.name === 'development') {
    mainWindow.loadURL('http://localhost:3000/index.html');
    mainWindow.openDevTools();
  } else {
    mainWindow.loadURL('file://' + __dirname + '/index.html');
  }
});

app.on('window-all-closed', app.quit);
