import { expect, Locator } from '@playwright/test';
import { App } from '../App';
import { EXPECTED_DETAILS_BY_PAGE, PageDetails } from '../constants';
import { BasePageObject } from './base.po';

export class NavPO extends BasePageObject {
  static get list(): Locator {
    return App.page.locator('ul.nav');
  }

  static get items(): Locator {
    return this.list.locator('li');
  }

  static get activeItem(): Locator {
    return this.list.locator('li.active');
  }

  static async getRouteFor(item: Locator) {
    const href = (await item.locator('a').getAttribute('href')) ?? '';
    return href.startsWith('#') ? href.slice(1) : href;
  }

  static async getIconAltFor(item: Locator) {
    const img = item.locator('a img');
    return (await img.getAttribute('alt')) ?? '';
  }

  static async getIconImgNameFor(item: Locator) {
    const img = item.locator('a img');
    const iconImgSrc = (await img.getAttribute('src')) ?? '';
    return iconImgSrc.slice(iconImgSrc.lastIndexOf('/') + 1);
  }

  static async isItemOk(item: Locator, expectedPageDetails: PageDetails) {
    // Poll: the URL changes before the AngularJS digest moves the `active` class to the new nav item
    await expect.poll(() => this.getRouteFor(item)).toBe(expectedPageDetails.route);
    expect(await this.getIconAltFor(item)).toBe(expectedPageDetails.iconAlt);
    expect(await this.getIconImgNameFor(item)).toBe(expectedPageDetails.iconImgName);
  }

  static async areItemsOk() {
    const EXPECTED_DETAILS = Object.values(EXPECTED_DETAILS_BY_PAGE);
    expect(await this.items.count()).toEqual(EXPECTED_DETAILS.length);
    for (const [n, expectedDetails] of EXPECTED_DETAILS.entries()) {
      await this.isItemOk(this.items.nth(n), expectedDetails);
    }
  }

  static async clickIcon(iconAlt: string) {
    const anchorTag = this.items.locator('a').filter({
      has: App.page.locator(`img[alt="${iconAlt}"]`)
    });
    await anchorTag.click();
  }
}
