# Testing

[![Playwright Tests](https://github.com/NREL/OpenStudio-PAT/actions/workflows/playwright.yml/badge.svg)](https://github.com/NREL/OpenStudio-PAT/actions/workflows/playwright.yml)

## Background

Automated E2E testing tests and verifies an app's behavior by interacting with UI elements, similar to how an actual user would.

PAT uses [playwright](https://playwright.dev/) to conduct automated E2E testing. Playwright was chosen thanks to its straightforward yet [powerful API](https://playwright.dev/docs/api/class-playwright), comprehensive [guided documentation](https://playwright.dev/docs/intro), built-in [Electron support](https://playwright.dev/docs/api/class-electronapplication), and increasing broader adoption. Tests and related files are written in [TypeScript](https://www.typescriptlang.org/).

<br/>

## Parallel vs. Serial Tests

As a framework, playwright supports executing tests in [multiple ways](https://playwright.dev/docs/test-parallel) with varying levels of parallelism.

PAT includes two different sets of tests, **Parallel** and **Serial**, which have important distinctions.

|                                          |                    Parallel                    |                            Serial                            |
| :--------------------------------------- | :--------------------------------------------: | :----------------------------------------------------------: |
| Tests are run...                         |                 Independently                  |                         Sequentially                         |
| Using...                                 |        Fresh app instance for each test        |                     Single app instance                      |
| If one test fails...                     |             No others are affected             |                    Remaining are skipped                     |
| # of tests in PAT<br/>at time of writing |                      189                       |                              22                              |
| Test files location                      |    [`playwright/tests/`](playwright/tests/)    |    [`playwright/tests/serial/`](playwright/tests/serial/)    |
| Configuration file                       | [`playwright.config.ts`](playwright.config.ts) | [`playwright-serial.config.ts`](playwright-serial.config.ts) |

**Parallel tests are generally preferred** since they are isolated and can be run more quickly.

PAT leverages its set of **Serial tests for when the local server needs to be running** (e.g., running an analysis). This is because it is neither practical nor time efficient to start & stop the local server for each and every one of these tests.

<br/>

## File Structure

Here is a list of Playwright-related files & folders:

- 📁 `playwright/`: Tests & all test-related files
  - 📁 `constants/`: Constant variables & types that are referenced across page object and test files
  - 📁 `mocks/`: Mocks for simulated system interaction (e.g., file picker dialog)
  - 📁 `page-objects/`: Per-page/modal/toast/menu-item static classes with helper functions & readonly variables for expected values. Page Object (PO) classes extend lower-level PO classes to provide basic variables/functions everywhere (e.g., getter for modal title on modal.po.ts, which is extended on by other ModalPOs). They can be used within any test file without requiring initialization. Here is [conceptual information](https://playwright.dev/docs/pom) about the Page Object Model.
  - 📁 `tests/`: Includes the following. Unlisted files (\*.spec.ts) represents test suites (e.g., run-page.spec.ts represents the Run Page test suite)
    - 📝 `shared.spec.ts`: Exports shared hooks, tests, and function for generating test.describe() for each project to test
    - 📁 `serial/`: Includes the following. Unlisted files (\*.spec.ts) export test.describe() blocks with tests
      - 📝 `serial.list.ts`: The single Serial test suite that imports tests from unlisted files
      - 📝 `shared.spec.ts`: Same purpose as tests/shared.spec.ts file
  - 📝 `.prettierrc.yaml`: Configures [Prettier](https://prettier.io/) formatting for test files
  - 📝 `App.ts`: Static class for interfacing with Electron APIs (e.g., open & close app)
  - 📝 `config-reporter.ts`: Exports function to generate the `reporters` array for Playwright configuration files
- 📁 `.tmp-test/`: Temporary project files used when running tests
- 📁 `reports/playwright/`: HTML report files generated after running tests. The root-level files are for Parallel tests.
  - 📁 `serial/`: Report files for Serial tests
- 📁 `playwright-results/`: Screenshots & videos taken when running tests (not used at time of writing)
- 📝 `.github/workflows/playwright.yml`: GitHub Actions template for running tests. It uses Ubuntu 24.04 and Node 24.
- 📝 `playwright.config.ts`: Configures Parallel tests
- 📝 `playwright-serial.config.ts`: Configures Serial tests (extends Parallel config)

<br/>

## How to Run Tests

If you haven't already installed the project dependencies, follow steps 1 & 2 of the "Getting Started" instructions in the [README.md](README.md).

### Use the `test` script to setup and run all tests:

```
npm run test
```

To specify number of workers (default is 4) and retries to handle the parallel tests issue described below, use this command, for example:

```
npm run test:parallel -- --workers=2 --retries=2
```

To keep the app window hidden and off the macOS dock while tests run locally (so they don't steal focus), set `HEADLESS_TEST=1`:

```
HEADLESS_TEST=1 npm run test
```

The `test` script runs the following commands in order:

1. `test:setup`, which runs:
   1. `test:build`, which builds PAT with the env variable set to "test"
   2. `test:tmpFiles`, which prepares the `.tmp-test` folder by copying some projects from `sample_projects`
2. `test:parallel`, which runs the Parallel tests
3. `test:serial`, which runs the Serial tests

You can run each of these scripts on an as-needed basis to speed up development time. Here are some examples:

- If you make changes to the app and want to run the Serial tests:
  ```
  npm run test:setup && npm run test:serial
  ```
- If you update a Parallel test in run-page.spec.ts and only want to run the tests in that file:
  ```
  npm run test:parallel -- run-page
  ```

### Potential false negative Parallel tests

When running locally, a small number of Parallel tests may randomly fail when they actually should pass. If false negatives occur, they should only occur infrequently. The tests should pass if you simply re-run them.

False negatives happen due to instability caused by running tests with multiple workers. By default, Parallel tests are run with 4 workers. To improve the stability of tests, you can [reduce the number of workers](https://playwright.dev/docs/test-parallel#disable-parallelism).

Here are the errors that may indicate a false negative result:

- `Attempted to register a second handler for 'test-*'`
  - Indicates that ipcMain.handle() was mocked twice
- `Target closed`
  - Indicates that the app closed during the test
