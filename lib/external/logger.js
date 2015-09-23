/**
 * @module lib/logger
 */
'use strict';

var bunyan = require('bunyan');
var path = require('path');

var logger = bunyan.createLogger({
  name: 'palantiri',
  streams: [{
    level: process.env.LOG_LEVEL_STDOUT,
    stream: process.stdout
  }],
  serializers: bunyan.stdSerializers,
  // DO NOT use src in prod, slow
  src: !!process.env.LOG_SRC,
  // default values included in all log objects
  commit: process.env.npm_package_gitHead,
  environment: process.env.NODE_ENV
});

module.exports = function (moduleName) {
  // relative path to file name
  moduleName = path.relative(process.cwd(), moduleName);
  var log = logger.child({
    module: moduleName
  }, true);

  return log;
};
