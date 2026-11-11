import { expect, test } from '@playwright/test';
import { appHooksSetup } from './shared.spec';
import { App } from '../App';

appHooksSetup();

test('application window title is "ParametricAnalysisTool"', async () => {
  await expect(App.page).toHaveTitle(/ParametricAnalysisTool/);
});

test('main window is hidden when HEADLESS_TEST=1', async () => {
  test.skip(process.env.HEADLESS_TEST !== '1', 'HEADLESS_TEST is not set');
  expect(await App.instance.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
});
