'use strict';

// Minimal replacement for gulp-angular-templatecache (unmaintained).
// Output is byte-compatible with it for the options PAT uses (module, root).

const path = require('path');
const through2 = require('through2');
const jsesc = require('jsesc');
const Vinyl = require('vinyl');

module.exports = function templateCache(filename, { module: moduleName, root = '' }) {
  const entries = [];
  let first = null;

  return through2.obj(
    function (file, enc, cb) {
      if (file.isNull() || (file.stat && file.stat.isDirectory())) {
        return cb();
      }
      if (!first) {
        first = file;
      }
      let url = path.join(root, path.normalize(file.path).replace(file.base + path.sep, ''));
      if (process.platform === 'win32') {
        url = url.replace(/\\/g, '/');
      }
      entries.push(`$templateCache.put('${url}','${jsesc(file.contents.toString('utf8'), {})}');`);
      cb();
    },
    function (cb) {
      if (first) {
        const body = `angular.module('${moduleName}').run(['$templateCache', function($templateCache) {` +
          entries.join('\n') + '}]);';
        this.push(new Vinyl({
          cwd: first.cwd,
          base: first.base,
          path: path.join(first.base, filename),
          contents: Buffer.from(body)
        }));
      }
      cb();
    }
  );
};
