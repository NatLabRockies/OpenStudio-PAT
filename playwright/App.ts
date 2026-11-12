import { ConsoleMessage, ElectronApplication, Page, _electron as electron } from '@playwright/test';
import { MAIN_SCRIPT_PATH } from './constants';

// Hidden, dockless window for local runs so tests don't steal focus. CI stays visible:
// nobody's focus to steal there, and CSS animations stall in hidden windows under xvfb.
export const HEADLESS_TEST = process.env.HEADLESS_TEST ?? (process.env.CI ? '0' : '1');

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

    const env = { ...process.env, HEADLESS_TEST: HEADLESS_TEST } as Record<string, string>;
    App.instance = await electron.launch({ args, env });

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
    return App.instance.evaluate(async ({ app }, params) => app.applicationMenu!.getMenuItemById(params.menuItem), {
      menuItem
    });
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

  static async isServerRunning(statusUrl = 'http://localhost:8080/status.json') {
    return App.page.evaluate(
      statusUrl =>
        fetch(statusUrl).then(
          r => r.ok,
          () => false
        ),
      statusUrl
    );
  }

  // Fails as soon as PAT logs that start_local failed, instead of polling until the test timeout.
  static async waitForServerState(shouldBeRunning = true, statusUrl = 'http://localhost:8080/status.json') {
    if (!shouldBeRunning) {
      return App.pollServerState(false, statusUrl);
    }
    let onConsole: (msg: ConsoleMessage) => void = () => {};
    const startFailed = new Promise<never>((_, reject) => {
      onConsole = msg => {
        if (/Server failed to start|start_local exited/.test(msg.text())) {
          reject(new Error(`PAT could not start the local server: ${msg.text()}`));
        }
      };
      App.page.on('console', onConsole);
    });
    try {
      await Promise.race([App.pollServerState(true, statusUrl), startFailed]);
    } finally {
      App.page.off('console', onConsole);
    }
  }

  private static async pollServerState(shouldBeRunning: boolean, statusUrl: string) {
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
