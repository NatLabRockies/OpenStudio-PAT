import { expect, test } from '@playwright/test';
import { appHooksSetup } from './shared.spec';
import { App } from '../App';
import { EXPECTED_MENU_STRUCTURE } from '../constants';
import { IPC_MAIN_HANDLE_MOCKS } from '../mocks';
import {
  EnglishMenuItemPO,
  FrenchMenuItemPO,
  LearnMoreMenuItemPO,
  SelectProjectModalPO,
  ToggleDebugMessagesMenuItemPO
} from '../page-objects';

// Reads a value from an AngularJS service of the app
const fromService = (service: string, method: string) =>
  App.page.evaluate(
    ({ service, method }) => (window as any).angular.element(document.body).injector().get(service)[method](),
    { service, method }
  );
const languageChecked = async () => ({
  English: await EnglishMenuItemPO.isChecked(),
  French: await FrenchMenuItemPO.isChecked()
});

appHooksSetup();

test.beforeEach(async () => await SelectProjectModalPO.isOk()); // effectively waits for app (and menu bar) to load

test('application menu has the expected structure for this platform', async () => {
  const { name, items } = await App.getMenuStructure();
  const expected =
    process.platform === 'darwin' ? EXPECTED_MENU_STRUCTURE.darwin(name) : EXPECTED_MENU_STRUCTURE.other();
  expect(items.map(item => item.label)).toEqual(expected.map(item => item.label));
  expect(items).toEqual(expected);
});

test.describe('clicking a menu item in the main process reaches its handler in the renderer', () => {
  test('"Toggle Debug Messages" toggles the debug message flag', async () => {
    const before = await fromService('Message', 'showDebug');
    await ToggleDebugMessagesMenuItemPO.click();
    await expect.poll(() => fromService('Message', 'showDebug')).toBe(!before);
  });

  test('"Learn More" opens https://www.openstudio.net/ in the external browser', async () => {
    const argsPromise = App.mockIpcMainHandle(IPC_MAIN_HANDLE_MOCKS.openExternalChannel);
    await LearnMoreMenuItemPO.click();
    expect(await argsPromise).toEqual(['https://www.openstudio.net/']);
  });

  test('"French" switches the language and the checked radio item', async () => {
    expect(await fromService('$translate', 'use')).toBe('en');
    expect(await languageChecked()).toEqual({ English: true, French: false });
    await FrenchMenuItemPO.click();
    await expect.poll(() => fromService('$translate', 'use')).toBe('fr');
    expect(await languageChecked()).toEqual({ English: false, French: true });
  });
});

test.describe('language radio items follow the renderer', () => {
  const setMenuLanguage = (language: any) =>
    App.page.evaluate(language => (window as any).patBridge.setMenuLanguage(language), language);

  test('setMenuLanguage() checks the item of a known language and ignores anything else', async () => {
    await setMenuLanguage('fr');
    await expect.poll(languageChecked).toEqual({ English: false, French: true });
    await setMenuLanguage('constructor');
    await setMenuLanguage({ language: 'en' });
    await setMenuLanguage('en');
    await expect.poll(languageChecked).toEqual({ English: true, French: false });
  });

  test('"English" is checked again after the page reloads in its default language', async () => {
    await FrenchMenuItemPO.click();
    await expect.poll(() => fromService('$translate', 'use')).toBe('fr');
    await App.page.reload();
    await SelectProjectModalPO.isOk();
    expect(await fromService('$translate', 'use')).toBe('en');
    await expect.poll(languageChecked).toEqual({ English: true, French: false });
  });
});
