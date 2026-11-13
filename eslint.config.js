'use strict';

const js = require('@eslint/js');
const globals = require('globals');
const lodash = require('eslint-plugin-lodash');

module.exports = [
  {ignores: ['app/app/reports/projectReports/vendor/**']}, // third-party minified files
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jasmine,
        ...globals.node,
        _: true,
        inject: true,
        module: true
      }
    },
    plugins: {lodash},
    // ESLint 9+ warns on unused eslint-disable comments by default; ESLint 6 did not
    linterOptions: {reportUnusedDisableDirectives: 'off'},
    rules: {
      // Added to eslint:recommended in ESLint 10; 17 hits in app/, left for a cleanup
      'no-useless-assignment': 'off',
      // In eslint:recommended of ESLint 6, dropped from it in ESLint 9
      'no-extra-semi': 'error',
      'no-inner-declarations': ['error', 'functions', {blockScopedFunctions: 'disallow'}],
      // Possible errors
      'no-console': 'off', // Comment for production
      // Best practices
      'dot-notation': 'warn',
      'no-multi-spaces': 'warn',
      // Variables
      'no-unused-vars': ['warn', {caughtErrors: 'none'}], // ESLint 9+ default is 'all'
      // Stylistic Issues
      'array-bracket-spacing': 'warn',
//    'camelcase': ['warn', {'properties': 'always'}],
      'comma-spacing': 'warn',
      'consistent-this': ['error', 'vm'],
      'no-mixed-spaces-and-tabs': 'warn',
      'no-trailing-spaces': 'warn',
      'quote-props': ['error', 'as-needed', {keywords: true}],
      'quotes': ['warn', 'single'],
      'semi': ['error', 'always'],
      // ES6
      'no-confusing-arrow': 'error',
      'no-const-assign': 'error',
      'no-var': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-const': 'warn',
      // Lodash
      'lodash/callback-binding': 'error',
      'lodash/collection-return': 'error',
      'lodash/matches-prop-shorthand': ['warn', 'always'],
      'lodash/matches-shorthand': ['warn', 'always'],
      'lodash/no-double-unwrap': 'error',
      'lodash/no-extra-args': 'error',
      'lodash/prefer-constant': 'warn',
      'lodash/prefer-filter': ['warn', 3],
      'lodash/prefer-get': ['warn', 2],
      'lodash/prefer-is-nil': 'warn',
      'lodash/prefer-lodash-typecheck': 'warn',
      'lodash/prefer-matches': ['warn', 2],
      'lodash/prefer-startswith': 'warn',
      'lodash/prefer-times': 'warn',
      'lodash/preferred-alias': 'warn',
      'lodash/prop-shorthand': ['warn', 'always'],
      'lodash/unwrap': 'error'
    }
  },
  {
    files: ['app/app/**'],
    languageOptions: {globals: {angular: true}}
  },
  {
    files: ['tasks/**'],
    rules: {
      // ES6
      'no-confusing-arrow': 0,
      'no-const-assign': 0,
      'no-var': 0,
      'prefer-arrow-callback': 0,
      'prefer-const': 0
    }
  }
];
