import { expect, test } from '@playwright/test';
import { appHooksSetup } from './shared.spec';
import { App } from '../App';

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
    paths: { appData: 'string', exe: 'string', temp: 'string', userData: 'string' },
    quit: 'function',
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

test('quit() reaches app.quit in the main process', async () => {
  await App.instance.evaluate(({ app }) => {
    const quit = app.quit;
    app.quit = () => {
      app.quit = quit;
      (global as any).patQuitCalled = true;
    };
  });
  await App.page.evaluate(() => (window as any).patBridge.quit());
  await expect.poll(() => App.instance.evaluate(() => (global as any).patQuitCalled)).toBe(true);
});

test.describe('pat:shell:openExternal', () => {
  for (const url of ['file:///etc/hosts', 'javascript:alert(1)', 'mailto:someone@example.com', 'localhost:8080', 42]) {
    test(`rejects ${JSON.stringify(url)}`, async () => {
      expect((await invoke('pat:shell:openExternal', url)).error).toBeTruthy();
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
  test('rejects a path that is not a string', async () => {
    expect((await invoke('pat:shell:openPath', { path: '/' })).error).toBeTruthy();
  });

  test('passes a string to shell.openPath and returns its result', async () => {
    await stubInMain('shell', 'openPath', '');
    expect(await invoke('pat:shell:openPath', '/some/folder')).toEqual({ value: '' });
    expect(await stubCalls()).toEqual([['/some/folder']]);
  });
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
