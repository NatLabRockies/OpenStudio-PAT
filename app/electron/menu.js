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
// The application menu, built in the main process. Items without a role or a main-process action send their id
// (the label, as before) to the renderer, which maps ids to handlers in app/app/index.run.js.

import { app, ipcMain, Menu } from 'electron';

export function setApplicationMenu(mainWindow) {
  const toRenderer = item => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('pat:menu', item.id);
  };
  const quit = () => app.quit();

  const fileMenu = {
    label: 'File',
    submenu: [{
      label: 'New',
      accelerator: 'Ctrl+N',
      click: toRenderer
    }, {
      label: 'Open',
      accelerator: 'Ctrl+O',
      click: toRenderer
    }, {
      label: 'Save',
      accelerator: 'Ctrl+S',
      click: toRenderer
    }, {
      label: 'Save As',
      click: toRenderer
    }, {
      label: 'Quit',
      accelerator: 'Ctrl+Q',
      click: quit
    }]
  };
  const template = [{
    label: 'Edit',
    submenu: [{
      label: 'Cut',
      accelerator: 'CmdOrCtrl+X',
      role: 'cut'
    }, {
      label: 'Copy',
      accelerator: 'CmdOrCtrl+C',
      role: 'copy'
    }, {
      label: 'Paste',
      accelerator: 'CmdOrCtrl+V',
      role: 'paste'
    }, {
      label: 'Select All',
      accelerator: 'CmdOrCtrl+A',
      role: 'selectall'
    }]
  }, {
    label: 'View',
    submenu: [{
      label: 'Language',
      submenu: [{
        label: 'English',
        type: 'radio',
        checked: true, // the renderer reports its language on every load, see pat:menu:language below
        click: toRenderer
      }, {
        label: 'French',
        type: 'radio',
        checked: false,
        click: toRenderer
      }]
    }, {
      label: 'Toggle Full Screen',
      accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
      click(item, focusedWindow) {
        if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    }, {
      label: 'Toggle Developer Tools',
      accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
      click(item, focusedWindow) {
        if (focusedWindow) focusedWindow.webContents.toggleDevTools();
      }
    }, {
      label: 'Toggle Debug Messages',
      click: toRenderer
    }]
  }, {
    label: 'Window',
    role: 'window',
    submenu: [{
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    }, {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    }, {
      label: 'Open BCL',
      click: toRenderer
    }, {
      label: 'Set MyMeasures Directory',
      click: toRenderer
    }, {
      label: 'Server Tools',
      click: toRenderer
    }]
  }, {
    label: 'Help',
    role: 'help',
    submenu: [{
      label: 'Learn More',
      click: toRenderer
    }, {
      label: 'Search Issues',
      click: toRenderer
    }]
  }];

  if (process.platform === 'darwin') {
    const name = app.name;
    template.unshift({
      label: name,
      submenu: [{
        label: 'About ' + name,
        role: 'about'
      }, {
        type: 'separator'
      }, {
        label: 'Services',
        role: 'services',
        submenu: []
      }, {
        type: 'separator'
      }, {
        label: 'Hide ' + name,
        accelerator: 'Command+H',
        role: 'hide'
      }, {
        label: 'Hide Others',
        accelerator: 'Command+Alt+H',
        role: 'hideothers'
      }, {
        label: 'Show All',
        role: 'unhide'
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: quit
      }]
    }, {
      label: 'File',
      submenu: [{
        label: 'New',
        accelerator: 'Command+N',
        click: toRenderer
      }, {
        label: 'Open',
        accelerator: 'Command+O',
        click: toRenderer
      }, {
        label: 'Save',
        accelerator: 'Command+S',
        click: toRenderer
      }, {
        label: 'Save As',
        click: toRenderer
      }]
    });

    // Window menu.
    // Index 3 is "View" since the two menus above were added, so this has always landed there; kept as is.
    template[3].submenu.push({
      type: 'separator'
    }, {
      label: 'Bring All to Front',
      role: 'front'
    });
  } else {
    template.unshift(fileMenu);
  }

  const addIds = items => items.map(item => Object.assign({}, item,
    item.label ? {id: item.label} : null,
    item.submenu ? {submenu: addIds(item.submenu)} : null));

  const menu = Menu.buildFromTemplate(addIds(template));
  Menu.setApplicationMenu(menu);

  // The renderer starts in its default language on every (re)load; keep the radio items in step with it
  const languageIds = {en: 'English', fr: 'French'};
  ipcMain.on('pat:menu:language', (event, language) => {
    if (event.sender !== mainWindow.webContents || !Object.keys(languageIds).includes(language)) return;
    menu.getMenuItemById(languageIds[language]).checked = true;
  });
}
