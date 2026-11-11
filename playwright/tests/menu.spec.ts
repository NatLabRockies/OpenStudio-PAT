import { expect, test } from '@playwright/test';
import { appHooksSetup } from './shared.spec';
import { App } from '../App';
import { EXPECTED_MENU_STRUCTURE } from '../constants';
import { SelectProjectModalPO } from '../page-objects';

appHooksSetup();

test.beforeEach(async () => await SelectProjectModalPO.isOk()); // effectively waits for app (and menu bar) to load

test('application menu has the expected structure for this platform', async () => {
  const { name, items } = await App.getMenuStructure();
  const expected =
    process.platform === 'darwin' ? EXPECTED_MENU_STRUCTURE.darwin(name) : EXPECTED_MENU_STRUCTURE.other();
  expect(items.map(item => item.label)).toEqual(expected.map(item => item.label));
  expect(items).toEqual(expected);
});
