'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');

const { partials } = require('./inject');
const { scriptsWatch } = require('./scripts');
const { styles } = require('./styles');

function watch() {
  gulp.watch(path.posix.join(conf.paths.src, '/**/*.scss'), styles);
  gulp.watch(path.posix.join(conf.paths.src, '/**/*.js'), scriptsWatch);
  gulp.watch(path.posix.join(conf.paths.src, '/**/*.html'), partials);
}

exports.watch = watch;
