import { expect, test } from '@playwright/test';
import fs from 'fs';
import { appHooksSetup, describeProjects } from './shared.spec';
import { App } from '../App';
import { EXPECTED_DETAILS_BY_PAGE, Page, Projects } from '../constants';
import { IPC_MAIN_HANDLE_MOCKS } from '../mocks';
import { NavPO, ReportsPO, SelectProjectModalPO } from '../page-objects';

// window.patBridge (app/electron/main_preload.js) and its main-process channels (app/electron/ipc.js).
// Nothing here opens a native dialog, menu or browser: the Electron functions behind the channels are replaced in
// the main process before a channel is given input it would accept.

appHooksSetup();

// Calls a real "pat:" channel from the renderer. In the test env window.patBridge itself sends dialogs and
// openExternal to the "test-" channels, which only exist while a test mocks them.
const invoke = (channel: string, ...args: any[]) =>
  App.page.evaluate(
    ({ channel, args }) =>
      require('electron')
        .ipcRenderer.invoke(channel, ...args)
        .then(
          (value: any) => ({ value }),
          (error: Error) => ({ error: error.message })
        ),
    { channel, args }
  );

// Replaces electron.<item>.<fn> in the main process with a recorder that returns returnValue
const stubInMain = (item: 'dialog' | 'shell', fn: string, returnValue?: any) =>
  App.instance.evaluate(
    (electron, { item, fn, returnValue }) => {
      const calls: any[][] = ((global as any).patStubCalls = []);
      const stub = async (...args: any[]) => {
        calls.push(args);
        return returnValue;
      };
      (electron as any)[item][fn] = stub;
      if ((electron as any)[item][fn] !== stub) throw new Error(`could not stub ${item}.${fn}`);
    },
    { item, fn, returnValue }
  );
const stubCalls = () => App.instance.evaluate(() => (global as any).patStubCalls as any[][]);

test('window.patBridge exposes exactly the expected members', async () => {
  const shape = await App.page.evaluate(() => {
    const describe = (o: any): any =>
      Object.fromEntries(
        Object.keys(o)
          .sort()
          .map(k => [k, typeof o[k] === 'object' ? describe(o[k]) : typeof o[k]])
      );
    return describe((window as any).patBridge);
  });
  expect(shape).toEqual({
    appPath: 'string',
    dialog: { showMessageBox: 'function', showOpenDialog: 'function' },
    exitClicked: 'function',
    onMenuClick: 'function',
    paths: { appData: 'string', exe: 'string', temp: 'string', userData: 'string' },
    quit: 'function',
    setMenuLanguage: 'function',
    shell: { openExternal: 'function', openPath: 'function' }
  });
});

test('app path and paths match the main process', async () => {
  const fromMain = await App.instance.evaluate(({ app }) => ({
    appPath: app.getAppPath(),
    paths: {
      userData: app.getPath('userData'),
      appData: app.getPath('appData'),
      temp: app.getPath('temp'),
      exe: app.getPath('exe')
    }
  }));
  const fromBridge = await App.page.evaluate(() => {
    const { appPath, paths } = (window as any).patBridge;
    return { appPath, paths };
  });
  expect(fromBridge).toEqual(fromMain);
  expect(fromBridge.appPath.length).toBeGreaterThan(0);
});

test('exitClicked() is false while the window is not closing', async () => {
  expect(await App.page.evaluate(() => (window as any).patBridge.exitClicked())).toBe(false);
});

// A real quit: if the app did not exit, this fails here and not in the teardown
test('quit() quits the app', async () => {
  const closed = App.instance.waitForEvent('close');
  await App.page.evaluate(() => (window as any).patBridge.quit());
  await closed;
});

test.describe('pat:shell:openExternal', () => {
  for (const url of ['file:///etc/hosts', 'javascript:alert(1)', 'mailto:someone@example.com', 'localhost:8080', 42]) {
    test(`rejects ${JSON.stringify(url)}`, async () => {
      await stubInMain('shell', 'openExternal');
      expect((await invoke('pat:shell:openExternal', url)).error).toContain('only http and https URLs are allowed');
      expect(await stubCalls()).toEqual([]);
    });
  }

  for (const url of ['http://localhost:8080', 'https://www.openstudio.net/']) {
    test(`passes ${url} to shell.openExternal`, async () => {
      await stubInMain('shell', 'openExternal');
      expect(await invoke('pat:shell:openExternal', url)).toEqual({});
      expect(await stubCalls()).toEqual([[url]]);
    });
  }
});

test.describe('pat:shell:openPath', () => {
  // Only an existing file named measure.rb or results.csv is opened (the two files the app opens)
  const rejected: [string, any, string][] = [
    ['a path that is not a string', { path: '/' }, 'path must be a string'],
    ['a relative path', 'results.csv', 'path must be absolute'],
    ['an application', '/System/Applications/Calculator.app', 'only measure.rb and results.csv can be opened'],
    ['a script', '/tmp/run.command', 'only measure.rb and results.csv can be opened'],
    ['a missing file', '/nonexistent/measure.rb', 'no such file']
  ];
  for (const [name, file, message] of rejected) {
    test(`rejects ${name}`, async () => {
      await stubInMain('shell', 'openPath', '');
      expect((await invoke('pat:shell:openPath', file)).error).toContain(message);
      expect(await stubCalls()).toEqual([]);
    });
  }

  test('rejects an existing file with another name, and a directory with an allowed name', async ({}, testInfo) => {
    const script = testInfo.outputPath('run.command');
    const directory = testInfo.outputPath('results.csv');
    fs.writeFileSync(script, '');
    fs.mkdirSync(directory);
    await stubInMain('shell', 'openPath', '');
    expect((await invoke('pat:shell:openPath', script)).error).toContain('only measure.rb and results.csv');
    expect((await invoke('pat:shell:openPath', directory)).error).toContain('no such file');
    expect(await stubCalls()).toEqual([]);
  });

  // Through window.patBridge, not a literal channel name: openPath is the one member that is not rerouted to a
  // "test-" channel in the test env, so this also pins the preload's "pat:<item>:<fn>" channel names
  for (const name of ['measure.rb', 'results.csv']) {
    test(`patBridge.shell.openPath passes an existing ${name} to shell.openPath and returns its result`, async ({}, testInfo) => {
      const file = testInfo.outputPath(name);
      fs.writeFileSync(file, '');
      await stubInMain('shell', 'openPath', '');
      expect(await App.page.evaluate(file => (window as any).patBridge.shell.openPath(file), file)).toBe('');
      expect(await stubCalls()).toEqual([[file]]);
    });
  }
});

// In the test env the bridge sends dialogs and openExternal to the "test-" channels that Playwright mocks
test.describe('window.patBridge in the test env', () => {
  const cases: [string, string, any][] = [
    ['dialog.showOpenDialog', IPC_MAIN_HANDLE_MOCKS.showOpenDialogChannel, { properties: ['openDirectory'] }],
    ['dialog.showMessageBox', IPC_MAIN_HANDLE_MOCKS.showMessageBoxChannel, { message: 'Hello' }],
    ['shell.openExternal', IPC_MAIN_HANDLE_MOCKS.openExternalChannel, 'https://www.openstudio.net/']
  ];
  for (const [member, channel, arg] of cases) {
    test(`${member} calls ${channel}`, async () => {
      const argsPromise = App.mockIpcMainHandle(channel, 'mocked');
      const result = await App.page.evaluate(
        ({ member, arg }) => {
          const [item, fn] = member.split('.');
          return (window as any).patBridge[item][fn](arg);
        },
        { member, arg }
      );
      expect(result).toBe('mocked');
      expect(await argsPromise).toEqual([arg]);
    });
  }
});

test.describe('pat:dialog', () => {
  test('showOpenDialog passes its options to dialog.showOpenDialog, without a parent window', async () => {
    const result = { canceled: false, filePaths: ['/some/folder'] };
    const options = { title: 'Open', properties: ['openDirectory'] };
    await stubInMain('dialog', 'showOpenDialog', result);
    expect(await invoke('pat:dialog:showOpenDialog', options)).toEqual({ value: result });
    expect(await stubCalls()).toEqual([[options]]);
  });

  test('showMessageBox passes its options to dialog.showMessageBox, without a parent window', async () => {
    const result = { response: 1, checkboxChecked: false };
    const options = { type: 'info', message: 'Hello', buttons: ['OK', 'Cancel'] };
    await stubInMain('dialog', 'showMessageBox', result);
    expect(await invoke('pat:dialog:showMessageBox', options)).toEqual({ value: result });
    expect(await stubCalls()).toEqual([[options]]);
  });
});

// app/background.js: the channels trust the app's page in the main window, so the window must not show another one
test.describe('main window', () => {
  const bridgeType = () => App.page.evaluate(() => typeof (window as any).patBridge);
  // Added after the app's own will-navigate listener, so defaultPrevented is what the app decided
  const recordNavigations = () =>
    App.instance.evaluate(({ BrowserWindow }) => {
      const navigations: any[] = ((global as any).patNavigations = []);
      BrowserWindow.getAllWindows()[0].webContents.on('will-navigate', (event, url) =>
        navigations.push({ file: url.split('#')[0].split('/').pop(), prevented: event.defaultPrevented })
      );
    });
  const navigations = () => App.instance.evaluate(() => (global as any).patNavigations);

  test('cannot navigate to another page', async () => {
    await SelectProjectModalPO.isOk();
    await recordNavigations();
    // A harmless target inside the build directory
    await App.page.evaluate(() => {
      location.href = location.href.split('#')[0].replace('index.html', 'env.json');
    });
    await expect.poll(navigations).toEqual([{ file: 'env.json', prevented: true }]);
    expect(App.page.url()).toContain('/index.html');
    expect(await bridgeType()).toBe('object');
  });

  test('can still reload its own page, and the bridge is there again', async () => {
    await SelectProjectModalPO.isOk();
    await recordNavigations();
    await App.page.evaluate(() => location.reload()).catch(() => {});
    await expect.poll(navigations).toEqual([{ file: 'index.html', prevented: false }]);
    await SelectProjectModalPO.isOk();
    expect(await bridgeType()).toBe('object');
  });

  test('cannot open a child window', async () => {
    expect(await App.page.evaluate(() => window.open('about:blank') === null)).toBe(true);
    expect(await App.instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  });
});

// window.onbeforeunload in app/app/index.run.js: with a project open the first close is held back while the app
// cleans up (exitClicked() must be true for that), and the app then quits through quit().
// The app is gone before the page could be inspected, so the test follows the console messages instead.
describeProjects(() => {
  test('closing the window runs the exit flow and then quits the app', async () => {
    const messages: string[] = [];
    App.page.on('console', message => messages.push(message.text()));
    await App.page.evaluate(() => {
      const bridge = (window as any).patBridge;
      const quit = bridge.quit;
      bridge.quit = () => {
        console.log('patBridge.quit()');
        quit();
      };
    });
    const closed = App.instance.waitForEvent('close');
    await App.instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
    await closed;
    expect(messages).toContain('EXIT BUTTON CLICKED?:  true');
    expect(messages).toContain('patBridge.quit()');
  });
}, [Projects.OFFICE_HVAC]);

// The reports webview has nodeintegration, so its page can reach ipcRenderer: it must get neither the bridge
// nor an answer from its channels (only the main window's webContents is trusted in app/electron/ipc.js)
describeProjects(() => {
  test('the reports webview gets neither the bridge nor its channels', async () => {
    await NavPO.clickIcon(EXPECTED_DETAILS_BY_PAGE[Page.REPORTS].iconAlt);
    await expect(ReportsPO.webview).toBeVisible();
    // true is what the main window would be told while it is closing
    await App.instance.evaluate(() => ((global as any).exitClicked = true));
    const fromWebview = () =>
      App.instance.evaluate(({ webContents }) => {
        const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
        if (!guest || guest.isLoading()) return null;
        return guest.executeJavaScript(`(async () => {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('pat:quit');
          ipcRenderer.send('pat:menu:language', 'fr');
          return {
            bridge: typeof window.patBridge,
            appInfo: ipcRenderer.sendSync('pat:app-info'),
            exitClicked: ipcRenderer.sendSync('pat:exit-clicked'),
            openPath: await ipcRenderer.invoke('pat:shell:openPath', 42).catch(error => error.message)
          };
        })()`);
      });
    await expect.poll(fromWebview).toEqual({
      bridge: 'undefined',
      appInfo: null,
      exitClicked: false,
      openPath: expect.stringContaining('untrusted sender')
    });
    // pat:quit and pat:menu:language were ignored: the app still runs and "French" is not checked
    const stillRunning = () =>
      App.instance.evaluate(({ app }) => ({
        exitClicked: ((global as any).exitClicked = false),
        french: app.applicationMenu!.getMenuItemById('French')!.checked
      }));
    expect(await fromWebview()).toMatchObject({ appInfo: null });
    expect(await stillRunning()).toEqual({ exitClicked: false, french: false });
  });
}, [Projects.OFFICE_HVAC]);
