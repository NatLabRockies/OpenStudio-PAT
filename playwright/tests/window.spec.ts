import { expect, test } from '@playwright/test';
import { appHooksSetup } from './shared.spec';
import { App } from '../App';

appHooksSetup();

test('application window title is "ParametricAnalysisTool"', async () => {
  await expect(App.page).toHaveTitle(/ParametricAnalysisTool/);
});
