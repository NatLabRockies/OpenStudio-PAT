/**
 *  This file contains the variables used in other gulp files
 *  which defines tasks
 *  By design, we only put there very generic config values
 *  which are used in several places to keep good readability
 *  of the tasks
 */
const fancyLog = require('fancy-log');

/**
 *  The main paths of your project handle these with care
 */
// gulp 5: globs for gulp.src/gulp.watch must use forward slashes, so build them with path.posix.join
exports.paths = {
  src: 'app',
  dist: 'build',
  tmp: '.tmp',
  tmpTest: '.tmp-test'
};

/**
 *  Common implementation for an error handler of a Gulp plugin
 */
exports.errorHandler = async function (title) {
  const chalk = (await import("chalk")).default;
  return function (err) {
    fancyLog(chalk.red('[' + title + ']'), err.toString());
    this.emit('end');
  };
};
