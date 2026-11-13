import path from 'path';
import { expect, Locator } from '@playwright/test';
import { EXPECTED_REPORT_VIEWS, Page, ReportView } from '../../constants';
import { PagePO } from './page.po';

export class ReportsPO extends PagePO {
  static readonly EXPECTED_PAGE = Page.REPORTS;
  static readonly EXPECTED_SRC_FOLDER = 'projectReports/';

  static get viewSelectDropdown(): Locator {
    return this.container.locator('select');
  }
  static get viewOptions(): Locator {
    return this.viewSelectDropdown.locator('option');
  }

  static getViewOptionWithName(name: string): Locator {
    return this.viewSelectDropdown.locator(`option[value="${name}"]`);
  }

  static async selectView(name: ReportView) {
    await this.viewSelectDropdown.selectOption(name);
  }

  static async isViewSelectDropdownOk() {
    await expect(this.viewOptions).toHaveCount(EXPECTED_REPORT_VIEWS.length);
    for (const expectedView of EXPECTED_REPORT_VIEWS) {
      const viewOption = this.getViewOptionWithName(expectedView);
      expect(await viewOption.innerText()).toEqual(expectedView);
    }
  }

  static async isWebviewOk(expectedSelectedView: ReportView) {
    await expect(this.webview).toBeVisible();

    const expectedSrc = `${this.EXPECTED_SRC_FOLDER}${expectedSelectedView}.html`;
    // Once the page has loaded, Electron rewrites src to the encoded URL (Summary%20Table.html)
    const wvSrc = decodeURI((await this.webview.getAttribute('src')) ?? '').slice(-1 * expectedSrc.length);
    expect(path.normalize(wvSrc)).toBe(path.normalize(expectedSrc));
  }
}
