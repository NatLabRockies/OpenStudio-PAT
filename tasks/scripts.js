'use strict';

var path = require('path');
var gulp = require('gulp');
var Q = require('q');
var jetpack = require('fs-jetpack');
var through2 = require('through2');
var conf = require('./conf');
var utils = require('./utils');
var $ = require('gulp-load-plugins')();

var rollup = require('rollup');
const { babel } = require('@rollup/plugin-babel');

var eslint = function (fix) {
  fix = !!fix;
  return gulp.src([
      path.posix.join(conf.paths.src, '**/*.js'),
      '!' + path.posix.join(conf.paths.src, 'node_modules/**')
    ], {base: '.'})
    .pipe($.eslint({fix: fix}))
    .pipe($.eslint.format())
    .pipe(fix ? gulp.dest('.') : through2.obj());
    //.pipe($.eslint.failAfterError());
};

function lint() {
  return eslint();
}

function lintFix() {
  return eslint(true);
}

var bundle = function (src, dest) {
  const buildSourcemap = path.basename(dest) == 'index.module.js';
  const filename = path.basename(dest);

  return rollup.rollup({
    input: src,
    external: ['adm-zip', 'electron', 'fs', 'fs-jetpack', 'http', 'https', 'jszip', 'os', 'path', 'url', 'xml2js', 'archiver', 'portfinder', 'version_compare', 'yamljs'],
    plugins: [
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**'
      })
    ]
  }).then(bundle => {
    return bundle.generate({
      format: 'cjs',
      sourcemap: buildSourcemap,
      sourcemapFile: filename
    });
  }).then(({ output }) => {
    // Wrap code in self invoking function so the variables don't
    // pollute the global namespace.
    const isolatedCode = '(function () {' + output[0].code + '\n}());';
    if (buildSourcemap) {
      return Q.all([
        jetpack.writeAsync(dest, isolatedCode + '\n//# sourceMappingURL=' + filename + '.map'),
        jetpack.writeAsync(dest + '.map', output[0].map.toString())
      ]);
    } else {
      return jetpack.writeAsync(dest, isolatedCode);
    }
  }).catch(function (err) {
    console.error('Build: Error during rollup', err.stack);
  });
};

var compileScripts = function () {
  var promises = [
    bundle(path.join(conf.paths.src, '/background.js'), path.join(conf.paths.tmp, 'serve/app/background.js')),
    bundle(path.join(conf.paths.src, '/electron/main_preload.js'), path.join(conf.paths.tmp, 'serve/app/main_preload.js')),
    bundle(path.join(conf.paths.src, '/app/index.module.js'), path.join(conf.paths.tmp, 'serve/app/index.module.js'))
  ];

  if (utils.getEnvName() == 'development') {
    promises.push(bundle(path.join(conf.paths.src, '/electron/browsersync_helper.js'), path.join(conf.paths.tmp, 'serve/app/browsersync_helper.js')));
  }

  return Q.all(promises);
};

exports.lint = lint;
exports.lintFix = lintFix;
exports.scripts = gulp.series(lint, compileScripts);
exports.scriptsWatch = compileScripts;
