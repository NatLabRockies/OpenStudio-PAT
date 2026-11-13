'use strict';

var Q = require('q');
var fancyLog = require('fancy-log');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('./utils');
var child_process = require('child_process');

var projectDir;
var releasesDir;
var tmpDir;
var finalAppDir;
var manifest;

const ELECTRON_HELPER_SUFFIXES = ['', ' (GPU)', ' (Plugin)', ' (Renderer)'];

var init = function () {
  projectDir = jetpack;
  tmpDir = projectDir.dir('./tmp', {empty: true});
  releasesDir = projectDir.dir('./releases');
  manifest = projectDir.read('app/package.json', 'json');
  finalAppDir = tmpDir.cwd(manifest.productName + '.app');

  return Q();
};

var copyRuntime = function () {
  return projectDir.copyAsync('node_modules/electron/dist/Electron.app', finalAppDir.path());
};

var cleanupRuntime = function () {
  finalAppDir.remove('Contents/Resources/default_app.asar');
  finalAppDir.remove('Contents/Resources/electron.icns');
  return Q();
};

var packageBuiltApp = function () {
  return asar.createPackage(projectDir.path('build'), finalAppDir.path('Contents/Resources/app.asar'));
};

var packageReports = function () {
  return projectDir.copyAsync(projectDir.path('app/app/reports/projectReports'), finalAppDir.path('Contents/Resources/projectReports'));
};

var finalize = function () {
  // Prepare main Info.plist
  var info = projectDir.read('resources/osx/Info.plist');
  info = utils.replace(info, {
    productName: manifest.productName,
    identifier: manifest.identifier,
    version: manifest.version
  });
  finalAppDir.write('Contents/Info.plist', info);

  // Prepare Info.plist of Helper apps
  ELECTRON_HELPER_SUFFIXES.forEach(function (helper_suffix) {
    info = projectDir.read('resources/osx/helper_apps/Info.plist');
    info = utils.replace(info, {
      productName: manifest.productName,
      identifier: manifest.identifier,
      helperSuffix: helper_suffix
    });
    finalAppDir.write(`Contents/Frameworks/Electron Helper${helper_suffix}.app/Contents/Info.plist`, info);
  });

  // Copy icon
  projectDir.copy('resources/osx/icon.icns', finalAppDir.path('Contents/Resources/icon.icns'));

  return Q();
};

var renameApp = function () {
  // Rename helpers
  ELECTRON_HELPER_SUFFIXES.forEach(function (helper_suffix) {
    finalAppDir.rename(
      `Contents/Frameworks/Electron Helper${helper_suffix}.app/Contents/MacOS/Electron Helper${helper_suffix}`,
      `${manifest.productName} Helper${helper_suffix}`
      );
    finalAppDir.rename(
      `Contents/Frameworks/Electron Helper${helper_suffix}.app`,
      `${manifest.productName} Helper${helper_suffix}.app`
      );
  });
  // Rename application
  finalAppDir.rename('Contents/MacOS/Electron', manifest.productName);
  return Q();
};

var signApp = function () {
  var identity = utils.getSigningId();
  if (identity) {
    var cmd = 'codesign --deep --force --sign "' + identity + '" "' + finalAppDir.path() + '"';
    fancyLog('Signing with:', cmd);
    return Q.nfcall(child_process.exec, cmd);
  } else {
    return Q();
  }
};

// var packToDmgFile = function () {
//   var deferred = Q.defer();
//
//   var appdmg = require('appdmg');
//   var dmgName = manifest.name + '_' + manifest.version + '.dmg';
//
//   // Prepare appdmg config
//   var dmgManifest = projectDir.read('resources/osx/appdmg.json');
//   dmgManifest = utils.replace(dmgManifest, {
//     productName: manifest.productName,
//     appPath: finalAppDir.path(),
//     dmgIcon: projectDir.path('resources/osx/dmg-icon.icns'),
//     dmgBackground: projectDir.path('resources/osx/dmg-background.png')
//   });
//   tmpDir.write('appdmg.json', dmgManifest);
//
//   // Delete DMG file with this name if already exists
//   releasesDir.remove(dmgName);
//
//   fancyLog('Packaging to DMG file...');
//
//   var readyDmgPath = releasesDir.path(dmgName);
//   appdmg({
//     source: tmpDir.path('appdmg.json'),
//     target: readyDmgPath
//   })
//     .on('error', function (err) {
//       console.error(err);
//     })
//     .on('finish', function () {
//       fancyLog('DMG file ready!', readyDmgPath);
//       deferred.resolve();
//     });
//
//   return deferred.promise;
// };

var cleanClutter = function () {
  return tmpDir.removeAsync('.');
};

module.exports = function () {
  return init()
    .then(copyRuntime)
    .then(cleanupRuntime)
    .then(packageBuiltApp)
    .then(packageReports)
    .then(finalize)
    .then(renameApp)
    .then(signApp)
    //.then(packToDmgFile)
    //.then(cleanClutter)
    .catch(console.error);
};
