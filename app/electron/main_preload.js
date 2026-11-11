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
// Preload of the main window: the only way the renderer reaches main-process APIs (handlers in ipc.js).
// contextIsolation is still off, so the bridge is assigned to window directly. Once isolation is on, replace the
// assignment with contextBridge.exposeInMainWorld('patBridge', bridge), which throws without isolation.

import { ipcRenderer } from 'electron';

const info = ipcRenderer.sendSync('pat:app-info');
const invoke = (item, fn, mockedInTest) => (...args) =>
  ipcRenderer.invoke(info.test && mockedInTest ? `test-${item}-${fn}` : `pat:${item}:${fn}`, ...args);

window.patBridge = {
  appPath: info.appPath,
  paths: info.paths,
  quit: () => ipcRenderer.send('pat:quit'),
  exitClicked: () => ipcRenderer.sendSync('pat:exit-clicked') === true,
  dialog: {
    showOpenDialog: invoke('dialog', 'showOpenDialog', true),
    showMessageBox: invoke('dialog', 'showMessageBox', true)
  },
  shell: {
    openExternal: invoke('shell', 'openExternal', true),
    openPath: invoke('shell', 'openPath')
  },
  // handler(id) is called with the id of a clicked application menu item (menu.js)
  onMenuClick: handler => {
    ipcRenderer.on('pat:menu', (event, id) => handler(id));
  },
  setMenuLanguage: language => ipcRenderer.send('pat:menu:language', language)
};
