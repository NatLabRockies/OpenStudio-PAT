import { expect, test } from '@playwright/test';
import { appHooksSetup, describeProjects } from './shared.spec';
import { App } from '../App';
import { EXPECTED_DETAILS_BY_PAGE, EXPECTED_REPORT_VIEWS, Page, Projects, ReportView } from '../constants';
import { NavPO, ReportsPO } from '../page-objects';

// The report pages run in a webview with nodeintegration, so everything they load must ship with the app.

appHooksSetup();

describeProjects(() => {
  for (const reportView of EXPECTED_REPORT_VIEWS) {
    test(`"${reportView}" report renders with the network blocked`, async () => {
      // Cancel and record whatever a webview requests from anywhere but the file system, and record failed loads
      await App.instance.evaluate(({ session, webContents }) => {
        const requests = ((global as any).reportRequests = { blocked: [] as string[], failed: [] as string[] });
        const fromWebview = (details: { webContentsId?: number }) =>
          webContents.fromId(details.webContentsId ?? -1)?.getType() === 'webview';
        session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
          const cancel = fromWebview(details) && !details.url.startsWith('file:');
          if (cancel) requests.blocked.push(details.url);
          callback({ cancel });
        });
        session.defaultSession.webRequest.onErrorOccurred(details => {
          if (fromWebview(details)) requests.failed.push(`${details.error} ${details.url}`);
        });
      });

      await NavPO.clickIcon(EXPECTED_DETAILS_BY_PAGE[Page.REPORTS].iconAlt);
      await ReportsPO.selectView(reportView);
      await ReportsPO.isWebviewOk(reportView);

      const isChart = reportView === ReportView.END_USE_COMPARISON;
      const report = () =>
        App.instance.evaluate(
          ({ webContents }, mainElement) => {
            const guest = webContents.getAllWebContents().find(wc => wc.getType() === 'webview');
            if (!guest || guest.isLoading()) return null;
            return guest
              .executeJavaScript(
                `({
                  page: decodeURI(location.pathname).split('/').pop(),
                  angular: window.angular && angular.version.full,
                  lodash: window._ && _.VERSION,
                  d3: window.d3 && d3.version,
                  bootstrapFontSize: getComputedStyle(document.body).fontSize,
                  mainElementShown: !!document.querySelector(${JSON.stringify(mainElement)}),
                  unrenderedTemplate: document.body.innerText.includes('{{')
                })`
              )
              .then(state => ({ ...state, ...(global as any).reportRequests }));
          },
          isChart ? 'svg rect' : 'table th'
        );
      await expect.poll(report).toEqual({
        page: `${reportView}.html`,
        angular: '1.5.8',
        lodash: '4.17.2',
        d3: isChart ? '4.4.0' : undefined,
        bootstrapFontSize: '14px',
        mainElementShown: true,
        unrenderedTemplate: false,
        blocked: [],
        failed: []
      });
    });
  }
}, [Projects.OFFICE_HVAC]);
