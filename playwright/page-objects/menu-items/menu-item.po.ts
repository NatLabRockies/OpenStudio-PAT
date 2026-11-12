import { expect } from '@playwright/test';
import { App } from '../../App';
import { BasePageObject } from '../base.po';

export class MenuItemPO extends BasePageObject {
  static readonly MENUS: string[];

  static async click() {
    return App.clickMenuItem(this.MENUS);
  }

  // checked state of the item in the main process (radio and checkbox items)
  static async isChecked(): Promise<boolean> {
    return App.instance.evaluate(
      ({ app }, params) => {
        let menuItem = app.applicationMenu!.getMenuItemById(params.menuItems[0]);
        for (let i = 1; i < params.menuItems.length; ++i) {
          menuItem = menuItem!.submenu!.getMenuItemById(params.menuItems[i]);
        }
        return menuItem!.checked;
      },
      { menuItems: this.MENUS }
    );
  }

  static async isOk() {
    const menu = await App.getMenuItem(this.MENUS[0]);
    expect(menu).toBeDefined();
    expect(menu!.label).toBe(this.MENUS[0]);

    let submenuItems = this.MENUS.length > 1 ? menu!.submenu!.items : undefined;
    for (let i = 1; i < this.MENUS.length; ++i) {
      expect(submenuItems).toContainEqual(expect.objectContaining({ label: this.MENUS[i] }));
      if (i < this.MENUS.length - 1) {
        submenuItems = submenuItems!.find(item => item.label === this.MENUS[i])!.submenu!.items;
      }
    }
  }
}
