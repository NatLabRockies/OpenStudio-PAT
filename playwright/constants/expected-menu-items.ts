export interface MenuItem {
  id: string;
  x?: MenuItems;
}

export type MenuItems = Record<string, MenuItem>;
export type SubMenu = MenuItem & { x: MenuItems };
export type Menu = Record<string, SubMenu>;

export const EXPECTED_MENU: Menu = {
  FILE: {
    id: 'File',
    x: {
      SAVE: {
        id: 'Save'
      }
    }
  },
  VIEW: {
    id: 'View',
    x: {
      LANGUAGE: {
        id: 'Language',
        x: {
          ENGLISH: {
            id: 'English'
          },
          FRENCH: {
            id: 'French'
          }
        }
      },
      TOGGLE_DEBUG_MESSAGES: {
        id: 'Toggle Debug Messages'
      }
    }
  },
  WINDOW: {
    id: 'Window',
    x: {
      SERVER_TOOLS: {
        id: 'Server Tools'
      }
    }
  },
  HELP: {
    id: 'Help',
    x: {
      LEARN_MORE: {
        id: 'Learn More'
      }
    }
  }
};
