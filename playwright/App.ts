import { ElectronApplication, Page, _electron as electron } from '@playwright/test';
import { MAIN_SCRIPT_PATH } from './constants';

export class App {
  static instance: ElectronApplication;
  static page: Page;

  static get isClosed() {
    return !App.instance?.windows().length;
  }

  static async close() {
    try {
      if (!App.isClosed) {
        await App.instance.close();
      }
    } catch {}
  }

  static async launchNewInstance() {
    await App.close();

    const args = [MAIN_SCRIPT_PATH];
    // GitHub Actions Ubuntu runners lack the setuid chrome-sandbox helper Electron needs
    if (process.env.CI && process.platform === 'linux') {
      args.unshift('--no-sandbox');
    }

    App.instance = await electron.launch({ args });

    App.page = await App.instance.firstWindow();
  }

  static async launchIfClosed() {
    if (App.isClosed) {
      await App.launchNewInstance();
    }
  }

  static async mockIpcMainHandle(channel: string, returnValue?: any) {
    return App.instance.evaluate(
      ({ ipcMain }, params) => {
        return new Promise<any[]>(resolve => {
          ipcMain.handle(params.channel, (_, ...args) => {
            resolve(args);
            return params.returnValue;
          });
        });
      },
      {
        channel,
        returnValue
      }
    );
  }

  static async removeAllIpcMainListeners(channel?: string) {
    try {
      await App.instance?.evaluate(({ ipcMain }, params) => ipcMain.removeAllListeners(params.channel), {
        channel
      });
    } catch {}
  }

  static async getMenuItem(menuItem: string) {
    // Return a plain projection: a raw MenuItem is not reliably serialisable across Electron versions
    return App.instance.evaluate(
      ({ app }, params) => {
        const plain = (i: any): any =>
          i && { label: i.label, submenu: i.submenu && { items: i.submenu.items.map(plain) } };
        return plain(app.applicationMenu!.getMenuItemById(params.menuItem));
      },
      { menuItem }
    );
  }

  static async clickMenuItem(menuItems: string[]) {
    return App.instance.evaluate(
      async ({ app }, params) => {
        let menuItem = app.applicationMenu!.getMenuItemById(params.menuItems[0]);
        for (let i = 1; i < params.menuItems.length; ++i) {
          menuItem = menuItem!.submenu!.getMenuItemById(params.menuItems[i]);
        }
        await menuItem!.click();
      },
      { menuItems }
    );
  }

  static async waitForServerState(shouldBeRunning = true, statusUrl = 'http://localhost:8080/status.json') {
    await App.page.evaluate(
      async ({ shouldBeRunning, statusUrl }) => {
        const hardWait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const pollDuration = 1_000;

        while (true) {
          try {
            const statusResponse = await fetch(statusUrl);
            if (statusResponse.ok === shouldBeRunning) {
              return;
            }
          } catch {
            if (!shouldBeRunning) {
              return;
            }
          }
          await hardWait(pollDuration);
        }
      },
      { shouldBeRunning, statusUrl }
    );
  }
}
