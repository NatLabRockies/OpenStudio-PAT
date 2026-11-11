'use strict';

var path = require('path');
var gulp = require('gulp');
var request = require('request');
var progress = require('request-progress');
var source = require('vinyl-source-stream');
var jetpack = require('fs-jetpack');
var conf = require('./conf');
var utils = require('./utils');
var _ = require('lodash');
var os = require('os');
var zlib = require('zlib');
var tar = require('tar-fs');
var gulpClean = require('gulp-clean');
var merge = require('merge-stream');
var rename = require('gulp-rename');

const { inject } = require('./inject');
const { scripts } = require('./scripts');

var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'lazypipe', 'streamify']
});

async function background() {
  return gulp.src(path.join(conf.paths.tmp, '/serve/app/background.js'))
  .pipe($.uglify()).on('error', await conf.errorHandler('Uglify background.js'))
  .pipe($.flatten())
  .pipe(gulp.dest(path.join(conf.paths.dist, '/')));
}

function preload() {
  return gulp.src(path.join(conf.paths.src, '/app/reports/preload.js'))
    .pipe($.flatten())
    .pipe(gulp.dest(path.join(conf.paths.dist, '/scripts')));
}

async function finalizeHtml() {
  const htmlFilter = $.filter('*.html', {restore: true});
  const jsFilter = $.filter('**/*.js', {restore: true});
  const cssFilter = $.filter('**/*.css', {restore: true});
  const notSourceMapFilter = $.filter(['**', '!*.map'], {restore: true});

  return gulp.src(path.join(conf.paths.tmp, '/serve/*.html'), { base: conf.paths.dist })
    .pipe($.flatten())
    .pipe($.useref({}, $.lazypipe().pipe($.sourcemaps.init, {loadMaps: true})))
    .pipe(jsFilter)
    .pipe($.ngAnnotate())
    .pipe($.rev())
    .pipe($.uglify()).on('error', await conf.errorHandler('Uglify'))
    .pipe($.sourcemaps.write('maps'))
    .pipe(jsFilter.restore)
    .pipe(cssFilter)
    .pipe($.replace('../node_modules/bootstrap-sass/assets/fonts/bootstrap/', '../fonts/'))
    .pipe($.replace(/url\('ui-grid.(.+?)'\)/g, 'url(\'../fonts/ui-grid.$1\')'))
    .pipe($.rev())
    .pipe($.csso())
    .pipe($.sourcemaps.write('maps'))
    .pipe(cssFilter.restore)
    .pipe(notSourceMapFilter)
    .pipe($.revReplace())
    .pipe(notSourceMapFilter.restore)
    .pipe(htmlFilter)
    .pipe($.htmlmin({
      collapseBooleanAttributes: true,
      collapseInlineTagWhitespace: true,
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeTagWhitespace: true
    }))
    .pipe(htmlFilter.restore)
    .pipe(gulp.dest(path.join(conf.paths.dist, '/')))
    .pipe($.size({
      title: path.join(conf.paths.dist, '/'),
      showFiles: true
    }));
}

const html = gulp.series(scripts, gulp.parallel(background, preload, inject), finalizeHtml);

// Only applies for fonts from bootstrap-sass & angular-ui-grid modules
// Custom fonts are handled by the "other" task
function fonts() {
  const NPM_FONT_DIRS = ['bootstrap-sass', 'angular-ui-grid'];
  const FONT_EXTENSIONS_GLOB = '/**/*.{eot,svg,ttf,woff,woff2}';

  return gulp.src(NPM_FONT_DIRS.map(fontDir => utils.mapNpmFilePath(`${fontDir}${FONT_EXTENSIONS_GLOB}`)))
    .pipe($.flatten())
    .pipe(gulp.dest(path.join(conf.paths.dist, '/fonts/')));
}

function other() {
  return gulp.src([
    path.join(conf.paths.src, '/**/*'),
    path.join('!' + conf.paths.src, '/node_modules/**/*'),
    path.join('!' + conf.paths.src, '/**/*.{html,css,js,scss}')
  ])
    .pipe($.filter(file => file.stat.isFile()))
    .pipe(rename(p => {
      if (p.dirname.startsWith(conf.paths.src)) {
        p.dirname = p.dirname.substring(conf.paths.src.length);
      }
    }))
    .pipe(gulp.dest(path.join(conf.paths.dist, '/')));
}

function nodeModules() {
  return gulp.src(path.join(conf.paths.src, '/node_modules/**/*'), {base: conf.paths.src})
    .pipe($.filter(file => file.stat.isFile()))
    .pipe(gulp.dest(path.join(conf.paths.dist, '/')));
}

async function clean() {
  await jetpack.removeAsync(conf.paths.dist);
  await jetpack.removeAsync(conf.paths.tmp);
}

function environment() {
  var configFile = 'config/env_' + utils.getEnvName() + '.json';
  return jetpack.copyAsync(configFile, path.join(conf.paths.dist, '/env.json'), {overwrite: true});
}

function finalizeBuild() {
  // Finalize
  var manifest = jetpack.read(path.join(__dirname, '..', conf.paths.src, 'package.json'), 'json');

  // Add "dev" or "test" suffix to name, so Electron will write all data
  // like cookies and localStorage in separate places for each environment.
  switch (utils.getEnvName()) {
    case 'development':
      manifest.name += '-dev';
      manifest.productName += 'Dev';
      break;
    case 'test':
      manifest.name += '-test';
      manifest.productName += 'Test';
      break;
  }

  return jetpack.writeAsync(path.join(__dirname, '..', conf.paths.dist, 'package.json'), manifest);
}

function copyManifest() {
  jetpack.copy('manifest.json', path.join(conf.paths.dist, '/manifest.json'), {overwrite: true});
}

// Binary dependency management

var argv = require('yargs').argv;

let destination = path.join(conf.paths.dist, '..', 'depend');
let dependencies = ['openstudio', 'energyplus', 'ruby', 'mongo', 'openstudioServer'];

if (argv.prefix) {
  destination = argv.prefix;
}

if (argv.exclude) {
  const without = argv.exclude.split(',');
  dependencies = _.difference(dependencies, without);
}

const manifest = jetpack.read('manifest.json', 'json');

const platform = os.platform();
// Support architecture override from GitHub Actions matrix or CMake
const cmakeArch = process.env.CMAKE_OSX_ARCHITECTURES ? process.env.CMAKE_OSX_ARCHITECTURES.split(';')[0] : null;
const arch = process.env.MATRIX_ARCH || cmakeArch || os.arch();

function getActualFileInfo(manifest, depend, platform, arch) {
  let fileInfo = _.find(manifest[depend], {platform: platform, arch: arch});
  if (!fileInfo && arch !== 'x64') {
    console.log(`Warning: Could not find ${depend} for ${platform}-${arch}, falling back to x64`);
    fileInfo = _.find(manifest[depend], {platform: platform, arch: 'x64'});
  }
  return fileInfo;
}

function downloadDeps() {

  // List the dependencies to download here
  // These should correspond to keys in the manifest

  console.log('Dependencies: ' + dependencies.sort().join(', '));
  var tasks = dependencies.map(depend => {
    const fileInfo = getActualFileInfo(manifest, depend, platform, arch);
    const fileName = fileInfo.name;

    // Note JM 2018-09-13: Allow other resources in case AWS isn't up to date
    // and for easier testing of new deps
    if( fileName.includes("http") ) {
      // Already a URI
      var uri = fileName;
      var destName = fileName.replace(/^.*[\\\/]/, '');
    } else {
      // Need to concat endpoint (AWS) with the fileName
      var uri = manifest.endpoint + encodeURIComponent(fileName);
      var destName = fileName;
    }

    return progress(request({uri: uri, timeout: 30000}))
      .on('progress', state => {
        console.log(`Downloading ${depend}, ${(state.percent * 100).toFixed(0)}%`);
      })
      .pipe(source(destName))
      .pipe(gulp.dest(destination));
  });

  return merge(tasks);
}

const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

function extractTarball(file, dir, options) {
  return pipelineAsync(
    jetpack.createReadStream(file),
    zlib.createGunzip(),
    tar.extract(dir, options)
  );
}

// There is a bug in tar-fs where, because stripped files & directories
// are given an empty header.name, having multiple stripped items
// results in having multiple headers with the same (empty) name,
// causing the extraction to either fail or hang.
//
// We avoid this issue by ignoring stripped items (ie, items with empty names)
const stripOptions = {
  strip: 1,
  ignore: (__, header) => header.name.length === 0
};

// The OpenStudio-server artifact may be double-archived: after stripping the
// outer layer the destination holds a single nested .tar.gz and no bin/.
// The inner tarball is extracted to a staging dir first so its root can be
// verified (OpenStudio-server/) before anything is moved into place.
async function unwrapNestedServerTarball(dir) {
  if (!jetpack.exists(dir) || jetpack.exists(path.join(dir, 'bin'))) {
    return;
  }
  const tarballs = (jetpack.list(dir) || []).filter(e => /\.(tar\.gz|tgz)$/i.test(e));
  if (tarballs.length !== 1) {
    return;
  }
  const inner = path.join(dir, tarballs[0]);
  const staging = path.join(dir, '.nested-extract');
  jetpack.remove(staging);
  try {
    await extractTarball(inner, staging, {});
    const roots = jetpack.list(staging) || [];
    if (roots.length !== 1 || roots[0] !== 'OpenStudio-server') {
      throw new Error('Unexpected layout in nested tarball ' + tarballs[0] + ': ' + roots.join(', '));
    }
    const root = path.join(staging, roots[0]);
    (jetpack.list(root) || []).forEach(entry => {
      jetpack.move(path.join(root, entry), path.join(dir, entry), {overwrite: true});
    });
    jetpack.remove(inner);
  } finally {
    jetpack.remove(staging);
  }
}

function extractDeps() {
  var tasks = dependencies.map(async depend => {
    const fileInfo = getActualFileInfo(manifest, depend, platform, arch);
    const fileName = fileInfo.name;

    if( fileName.includes("http") ) {
      var destName = fileName.replace(/^.*[\\\/]/, '');
    } else {
      var destName = fileName;
    }

    // Note JM 2018-0913:
    // Usually deps are properly zipped to that the extracted root folder
    // is adequately named, but when using absolute http:// resources (not
    // packaged specifically by us), we must rename to ensure it's correct
    var properName = fileInfo.type;

    // What we do is to extract to properName and remove the leading (root)
    // directory level, unless the archive (such as MongoDB 8.x) already puts
    // bin/ directly at the archive root without a wrapper directory.
    const properDestinationDir = path.join(destination, properName);
    jetpack.remove(properDestinationDir);
    const extractOptions = depend === 'mongo' ? {} : stripOptions;
    await extractTarball(path.join(destination, destName), properDestinationDir, extractOptions);
    if (depend === 'openstudioServer') {
      await unwrapNestedServerTarball(properDestinationDir);
    }
  });

  return Promise.all(tasks);
}

function cleanDeps() {
  var tasks = dependencies.map(depend => {
    const fileInfo = getActualFileInfo(manifest, depend, platform, arch);
    const fileName = fileInfo.name;

    if( fileName.includes("http") ) {
      var destName = fileName.replace(/^.*[\\\/]/, '');
    } else {
      var destName = fileName;
    }

    return gulp.src(path.join(destination, destName), {read: false, allowEmpty: true})
      .pipe(gulpClean());
  });

  return merge(tasks);
}

exports.build = gulp.series(gulp.parallel(html, fonts, nodeModules, other, environment), finalizeBuild);
exports.clean = clean;
exports.copyManifest = copyManifest;
exports.installDeps = gulp.series(downloadDeps, extractDeps, cleanDeps);
