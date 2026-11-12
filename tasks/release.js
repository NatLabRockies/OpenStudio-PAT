'use strict';

var gulp = require('gulp');
var flatten = require('gulp-flatten');
var utils = require('./utils');
var conf = require('./conf');
var path = require('path');

const { build } = require('./build');

var releaseForOs = {
  osx: require('./release_osx'),
  linux: require('./release_linux'),
  windows: require('./release_windows')
};

function reports() {
  return gulp.src(path.posix.join(conf.paths.src, 'app/reports/projectReports/*.html'))
    .pipe(flatten())
    .pipe(gulp.dest(conf.paths.dist));
}

function finalizeRelease() {
  return releaseForOs[utils.os()]();
}

exports.release = gulp.series(gulp.parallel(build, reports), finalizeRelease);
