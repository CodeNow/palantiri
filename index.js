/**
 * starts palantiri
 * @module index
 */

'use strict';
require('loadenv')();

var domain = require('domain');

var log = require('./lib/external/logger.js')(__filename);
var rabbitmq = require('./lib/external/rabbitmq.js');

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
    rabbitmq.connect(function (err) {
      if (err) {
        log.fatal({
          err: err
        }, 'palantiri error connecting to rabbit');
        throw err;
      }
      rabbitmq.loadWorkers();
      setInterval(function () {
        rabbitmq.publishHealthCheck();
      }, process.env.COLLECT_INTERVAL);
    });
  });
}

start();