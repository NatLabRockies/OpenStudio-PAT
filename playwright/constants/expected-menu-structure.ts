export interface MenuStructureItem {
  label?: string;
  id?: string;
  role?: string;
  type: string;
  accelerator?: string;
  checked?: boolean;
  submenu?: MenuStructureItem[];
}

// The application menu as it was built in the renderer through @electron/remote (commit 2c65c1f), captured from
// app.applicationMenu before the menu moved to the main process (app/electron/menu.js).
// "Bring All to Front" sitting under "View" on macOS is the captured behaviour, not a typo.
export const EXPECTED_MENU_STRUCTURE = {
  // name is app.name
  darwin: (name: string): MenuStructureItem[] => [
    {
      label: `${name}`,
      id: `${name}`,
      type: 'submenu',
      submenu: [
        {
          label: `About ${name}`,
          id: `About ${name}`,
          role: 'about',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          id: 'Services',
          role: 'services',
          type: 'submenu',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: `Hide ${name}`,
          id: `Hide ${name}`,
          role: 'hide',
          type: 'normal',
          accelerator: 'Command+H'
        },
        {
          label: 'Hide Others',
          id: 'Hide Others',
          role: 'hideothers',
          type: 'normal',
          accelerator: 'Command+Alt+H'
        },
        {
          label: 'Show All',
          id: 'Show All',
          role: 'unhide',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          id: 'Quit',
          type: 'normal',
          accelerator: 'Command+Q'
        }
      ]
    },
    {
      label: 'File',
      id: 'File',
      type: 'submenu',
      submenu: [
        {
          label: 'New',
          id: 'New',
          type: 'normal',
          accelerator: 'Command+N'
        },
        {
          label: 'Open',
          id: 'Open',
          type: 'normal',
          accelerator: 'Command+O'
        },
        {
          label: 'Save',
          id: 'Save',
          type: 'normal',
          accelerator: 'Command+S'
        },
        {
          label: 'Save As',
          id: 'Save As',
          type: 'normal'
        }
      ]
    },
    {
      label: 'Edit',
      id: 'Edit',
      type: 'submenu',
      submenu: [
        {
          label: 'Cut',
          id: 'Cut',
          role: 'cut',
          type: 'normal',
          accelerator: 'CmdOrCtrl+X'
        },
        {
          label: 'Copy',
          id: 'Copy',
          role: 'copy',
          type: 'normal',
          accelerator: 'CmdOrCtrl+C'
        },
        {
          label: 'Paste',
          id: 'Paste',
          role: 'paste',
          type: 'normal',
          accelerator: 'CmdOrCtrl+V'
        },
        {
          label: 'Select All',
          id: 'Select All',
          role: 'selectall',
          type: 'normal',
          accelerator: 'CmdOrCtrl+A'
        }
      ]
    },
    {
      label: 'View',
      id: 'View',
      type: 'submenu',
      submenu: [
        {
          label: 'Language',
          id: 'Language',
          type: 'submenu',
          submenu: [
            {
              label: 'English',
              id: 'English',
              type: 'radio',
              checked: true
            },
            {
              label: 'French',
              id: 'French',
              type: 'radio',
              checked: false
            }
          ]
        },
        {
          label: 'Toggle Full Screen',
          id: 'Toggle Full Screen',
          type: 'normal',
          accelerator: 'Ctrl+Command+F'
        },
        {
          label: 'Toggle Developer Tools',
          id: 'Toggle Developer Tools',
          type: 'normal',
          accelerator: 'Alt+Command+I'
        },
        {
          label: 'Toggle Debug Messages',
          id: 'Toggle Debug Messages',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: 'Bring All to Front',
          id: 'Bring All to Front',
          role: 'front',
          type: 'normal'
        }
      ]
    },
    {
      label: 'Window',
      id: 'Window',
      role: 'window',
      type: 'submenu',
      submenu: [
        {
          label: 'Minimize',
          id: 'Minimize',
          role: 'minimize',
          type: 'normal',
          accelerator: 'CmdOrCtrl+M'
        },
        {
          label: 'Close',
          id: 'Close',
          role: 'close',
          type: 'normal',
          accelerator: 'CmdOrCtrl+W'
        },
        {
          label: 'Open BCL',
          id: 'Open BCL',
          type: 'normal'
        },
        {
          label: 'Set MyMeasures Directory',
          id: 'Set MyMeasures Directory',
          type: 'normal'
        },
        {
          label: 'Server Tools',
          id: 'Server Tools',
          type: 'normal'
        }
      ]
    },
    {
      label: 'Help',
      id: 'Help',
      role: 'help',
      type: 'submenu',
      submenu: [
        {
          label: 'Learn More',
          id: 'Learn More',
          type: 'normal'
        },
        {
          label: 'Search Issues',
          id: 'Search Issues',
          type: 'normal'
        }
      ]
    }
  ],
  // win32 and linux; captured on macOS with process.platform overridden in the renderer
  other: (): MenuStructureItem[] => [
    {
      label: 'File',
      id: 'File',
      type: 'submenu',
      submenu: [
        {
          label: 'New',
          id: 'New',
          type: 'normal',
          accelerator: 'Ctrl+N'
        },
        {
          label: 'Open',
          id: 'Open',
          type: 'normal',
          accelerator: 'Ctrl+O'
        },
        {
          label: 'Save',
          id: 'Save',
          type: 'normal',
          accelerator: 'Ctrl+S'
        },
        {
          label: 'Save As',
          id: 'Save As',
          type: 'normal'
        },
        {
          label: 'Quit',
          id: 'Quit',
          type: 'normal',
          accelerator: 'Ctrl+Q'
        }
      ]
    },
    {
      label: 'Edit',
      id: 'Edit',
      type: 'submenu',
      submenu: [
        {
          label: 'Cut',
          id: 'Cut',
          role: 'cut',
          type: 'normal',
          accelerator: 'CmdOrCtrl+X'
        },
        {
          label: 'Copy',
          id: 'Copy',
          role: 'copy',
          type: 'normal',
          accelerator: 'CmdOrCtrl+C'
        },
        {
          label: 'Paste',
          id: 'Paste',
          role: 'paste',
          type: 'normal',
          accelerator: 'CmdOrCtrl+V'
        },
        {
          label: 'Select All',
          id: 'Select All',
          role: 'selectall',
          type: 'normal',
          accelerator: 'CmdOrCtrl+A'
        }
      ]
    },
    {
      label: 'View',
      id: 'View',
      type: 'submenu',
      submenu: [
        {
          label: 'Language',
          id: 'Language',
          type: 'submenu',
          submenu: [
            {
              label: 'English',
              id: 'English',
              type: 'radio',
              checked: true
            },
            {
              label: 'French',
              id: 'French',
              type: 'radio',
              checked: false
            }
          ]
        },
        {
          label: 'Toggle Full Screen',
          id: 'Toggle Full Screen',
          type: 'normal',
          accelerator: 'F11'
        },
        {
          label: 'Toggle Developer Tools',
          id: 'Toggle Developer Tools',
          type: 'normal',
          accelerator: 'Ctrl+Shift+I'
        },
        {
          label: 'Toggle Debug Messages',
          id: 'Toggle Debug Messages',
          type: 'normal'
        }
      ]
    },
    {
      label: 'Window',
      id: 'Window',
      role: 'window',
      type: 'submenu',
      submenu: [
        {
          label: 'Minimize',
          id: 'Minimize',
          role: 'minimize',
          type: 'normal',
          accelerator: 'CmdOrCtrl+M'
        },
        {
          label: 'Close',
          id: 'Close',
          role: 'close',
          type: 'normal',
          accelerator: 'CmdOrCtrl+W'
        },
        {
          label: 'Open BCL',
          id: 'Open BCL',
          type: 'normal'
        },
        {
          label: 'Set MyMeasures Directory',
          id: 'Set MyMeasures Directory',
          type: 'normal'
        },
        {
          label: 'Server Tools',
          id: 'Server Tools',
          type: 'normal'
        }
      ]
    },
    {
      label: 'Help',
      id: 'Help',
      role: 'help',
      type: 'submenu',
      submenu: [
        {
          label: 'Learn More',
          id: 'Learn More',
          type: 'normal'
        },
        {
          label: 'Search Issues',
          id: 'Search Issues',
          type: 'normal'
        }
      ]
    }
  ]
};
