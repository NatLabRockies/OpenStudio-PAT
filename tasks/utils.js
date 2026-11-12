'use strict';

var argv = require('yargs').argv;
var os = require('os');
var path = require('path');
var jetpack = require('fs-jetpack');
var conf = require('./conf');

var env = argv.env || 'development';

module.exports.os = function () {
  switch (os.platform()) {
    case 'darwin':
      return 'osx';
    case 'linux':
      return 'linux';
    case 'win32':
      return 'windows';
  }
  return 'unsupported';
};

module.exports.replace = function (str, patterns) {
  Object.keys(patterns).forEach(function (pattern) {
    var matcher = new RegExp('{{' + pattern + '}}', 'g');
    str = str.replace(matcher, patterns[pattern]);
  });
  return str;
};

module.exports.getEnvName = function () {
  return env;
};

module.exports.getSigningId = function () {
  return argv.sign;
};

module.exports.getElectronVersion = function () {
  var manifest = jetpack.read(__dirname + '/../package.json', 'json');
  return manifest.devDependencies['electron'].substring(1);
};

module.exports.mapNpmFilePath = filePath => path.posix.join(conf.paths.src, '/node_modules/', filePath);
