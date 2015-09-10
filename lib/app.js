/**
 * starts / stops palantiri
 * @module app
 */

'use strict';
require('loadenv')();

var domain = require('domain');

var log = require('./lib/external/logger.js')(__filename);
var rabbitmq = require('./lib/external/rabbitmq.js');

module.exports.start = start;
module.exports.stop = stop;

var interval;

/**
 * connects to rabbitmq and loads workers and start interval
 * @return {[type]} [description]
 */
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

      interval = setInterval(function () {
        rabbitmq.publishHealthCheck();
      }, process.env.COLLECT_INTERVAL);
    });
  });
}

/**
 * unloads workers, closes rabbit connection, and stops interval
 * @return {[type]} [description]
 */
function stop () {
  var workerDomain = domain.create();

  workerDomain.on('error', function (err) {
    log.fatal({
      err: err
    }, 'palantiri stopping domain error');
  });

  workerDomain.run(function () {
    log.info('palantiri stop');
    clearInterval(interval);

    rabbitmq.unloadWorkers(function (err) {
      if (err) {
        log.fatal({
          err: err
        }, 'palantiri error unloadWorkers workers');
      }

      rabbitmq.close(function (err) {
        if (err) {
          log.fatal({
            err: err
          }, 'palantiri error closing rabbitmq');
        }
      });
    });
  });
}
