'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');
var utils = require('./utils');

var $ = require('gulp-load-plugins')();
const sass = require('gulp-sass')(require('sass'));

const BOOTSTRAP_SASS_FILE_PATH = 'bootstrap-sass/assets/stylesheets/_bootstrap.scss';

async function styles() {
  var sassOptions = {
    outputStyle: 'expanded',
    precision: 8
  };

  var injectFiles = gulp.src([
    path.posix.join(conf.paths.src, '/app/**/*.scss'),
    path.posix.join('!' + conf.paths.src, '/app/bootstrap.scss'),
    path.posix.join('!' + conf.paths.src, '/app/index.scss'),
    path.posix.join('!' + conf.paths.src, '/app/styles/**/*')
  ], {read: false});

  var injectOptions = {
    ignorePath: [path.join(conf.paths.src, '/app')],
    addRootSlash: false,
    starttag: '/* inject */'
  };

  const npmInjectFiles = gulp.src([
    utils.mapNpmFilePath(BOOTSTRAP_SASS_FILE_PATH)
  ], { read: false });

  const npmInjectOptions = {
    ...injectOptions,
    ignorePath: [conf.paths.src],
    addPrefix: '..'
  };

  var bootstrapFilter = $.filter('**/bootstrap.scss', {restore: true});
  var indexFilter = $.filter('**/index.scss', {restore: true});

  return gulp.src([
      path.posix.join(conf.paths.src, '/app/bootstrap.scss'),
      path.posix.join(conf.paths.src, '/app/index.scss')
    ])
    .pipe(bootstrapFilter)
    .pipe($.inject(npmInjectFiles, npmInjectOptions))
    .pipe(sass(sassOptions)).on('error', await conf.errorHandler('Sass'))
    .pipe(bootstrapFilter.restore)
    .pipe(indexFilter)
    .pipe($.sourcemaps.init())
    .pipe($.inject(injectFiles, injectOptions))
    .pipe(sass(sassOptions)).on('error', await conf.errorHandler('Sass'))
    .pipe($.autoprefixer({
      cascade: false
    })).on('error', await conf.errorHandler('Autoprefixer'))
    .pipe($.sourcemaps.write())
    .pipe(indexFilter.restore)
    .pipe($.flatten())
    .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/app/')));
}

exports.styles = styles;
