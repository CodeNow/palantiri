'use strict';

var domain = require('domain');

var log = require('./lib/logger.js')(__filename).log;
var rabbitmq = require('./lib/rabbitmq.js');

module.exports.start = start;

function start () {
  var workerDomain = domain.create();

  workerDomain.on('error', function (err) {
    log.fatal({
      err: err
    }, 'palantiri domain error');
  });

  workerDomain.run(function () {
    log.info('palantiri start');
    setTimeout(function () {
      rabbitmq.publishHealthCheck();
    }, process.env.COLLECT_TIME_MS);
  });
}

start();