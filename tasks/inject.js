'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');
var utils = require('./utils');

var $ = require('gulp-load-plugins')();
var rename = require('gulp-rename');
var templateCache = require('./templateCache');

var _ = require('lodash');

const { styles } = require('./styles');

const NPM_CSS_FILE_PATHS = [
  'angular-toastr/dist/angular-toastr.css',
  'angular-ui-grid/ui-grid.css',
  'ngprogress/ngProgress.css'
];
const NPM_JS_FILE_PATHS = [
  'angular/angular.js',
  'angular-animate/angular-animate.js',
  'angular-aria/angular-aria.js',
  'angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
  'angular-bootstrap-checkbox/angular-bootstrap-checkbox.js',
  'angular-messages/angular-messages.js',
  'angular-resource/angular-resource.js',
  'angular-sanitize/angular-sanitize.js',
  'angular-toastr/dist/angular-toastr.tpls.js',
  'angular-translate/dist/angular-translate.js',
  'angular-translate-handler-log/angular-translate-handler-log.js',
  'angular-ui-grid/ui-grid.js',
  'angular-ui-router/release/angular-ui-router.js',
  'angular-ui-router.statehelper/statehelper.js',
  'jquery/dist/jquery.js',
  'lodash/lodash.js',
  'ngprogress/build/ngprogress.min.js',
  'ui-grid-draggable-rows/js/draggable-rows.js'
];

function partials() {
  const parentDirs = path.join(conf.paths.src, '/app/');
  return gulp.src(path.join(conf.paths.src, '/app/**/*.html'))
    .pipe(rename(p => {
      if (p.dirname.startsWith(parentDirs)) {
        p.dirname = p.dirname.substring(parentDirs.length);
      }
    }))
    .pipe($.sort())
    .pipe($.htmlmin({
      collapseBooleanAttributes: true,
      collapseInlineTagWhitespace: true,
      collapseWhitespace: false,
      removeComments: true,
      removeRedundantAttributes: true,
      removeTagWhitespace: true
    }))
    .pipe(templateCache('templateCacheHtml.js', {
      module: 'PAT',
      root: 'app'
    }))
    .pipe(gulp.dest(conf.paths.tmp + '/serve/app/'));
}

function finalizeInject() {
  var injectAppStyles = gulp.src([
    path.join(conf.paths.tmp, '/serve/app/**/*.css'),
    path.join('!' + conf.paths.tmp, '/serve/app/**/bootstrap.css')
  ], {read: false});
  var injectBootstrapStyles = gulp.src([path.join(conf.paths.tmp, '/serve/app/**/bootstrap.css')], {read: false});
  var injectScripts = gulp.src([path.join(conf.paths.tmp, '/serve/app/**/*.module.js')], {read: false});
  var partialsInjectFile = gulp.src(path.join(conf.paths.tmp, '/serve/app/templateCacheHtml.js'), {read: false});

  var injectOptions = {
    ignorePath: [conf.paths.src, path.join(conf.paths.tmp, '/serve')],
    addRootSlash: false
  };
  var bootstrapInjectOptions = _.extend({}, injectOptions, {starttag: '<!-- inject:bootstrap -->'});
  var partialsInjectOptions = _.extend({}, injectOptions, {starttag: '<!-- inject:partials -->'});

  const npmCssInjectFiles = gulp.src(NPM_CSS_FILE_PATHS.map(utils.mapNpmFilePath), { read: false });
  const npmJsInjectFiles = gulp.src(NPM_JS_FILE_PATHS.map(utils.mapNpmFilePath), { read: false });

  const npmCssInjectOptions = {
    addRootSlash: false,
    addPrefix: '..',
    starttag: '<!-- inject:npm:css -->'
  };

  const npmJsInjectOptions = {
    ...npmCssInjectOptions,
    starttag: '<!-- inject:npm:js -->'
  };


  var stream = gulp.src(path.join(conf.paths.src, '/*.html'))
    .pipe($.inject(injectAppStyles, injectOptions))
    .pipe($.inject(injectBootstrapStyles, bootstrapInjectOptions))
    .pipe($.inject(injectScripts, injectOptions))
    .pipe($.inject(partialsInjectFile, partialsInjectOptions))
    .pipe($.inject(npmCssInjectFiles, npmCssInjectOptions))
    .pipe($.inject(npmJsInjectFiles, npmJsInjectOptions));

  if (utils.getEnvName() == 'development') {
    var injectBrowsersyncHelper = gulp.src(path.join(conf.paths.tmp, '/serve/app/browsersync_helper.js'), {read: false});
    var browsersyncInjectOptions = _.extend({}, injectOptions, {starttag: '<!-- inject:browsersync -->'});
    stream = stream.pipe($.inject(injectBrowsersyncHelper, browsersyncInjectOptions));
  }

  return stream
    .pipe($.flatten())
    .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve')));
}

exports.partials = partials;
exports.inject = gulp.series(gulp.parallel(partials, styles), finalizeInject);
