import { expect, test } from '@playwright/test';
import { App } from '../App';
import { appHooksSetup } from './shared.spec';

appHooksSetup();

test('test runs keep the main window hidden so they do not steal focus', async () => {
  test.skip(process.env.HEADLESS_TEST === '0', 'window shown on purpose');
  const visible = await App.instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible());
  expect(visible).toBe(false);
});
