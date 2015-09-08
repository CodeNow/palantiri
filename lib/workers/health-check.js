/**
 * publishes all health related jobs
 *
 * This worker should
 *   create docker health jobs for each healthy host
 *
 * @module lib/workers/health-check
 */
'use strict';

require('loadenv')();

var util = require('util');
var put = require('101/put');

var BaseWorker = require('./base-worker.js');
var log = require('./../external/logger.js')(__filename);
var mavisClient = require('../external/mavis.js');
var rabbitmq = require('../external/rabbitmq.js');

module.exports = HealthCheck;

function HealthCheck () {
  log.info('HealthCheck constructor');
  this.name = 'health-check';
  BaseWorker.apply(this, arguments);
}

util.inherits(HealthCheck, BaseWorker);

/**
 * queries mavis for docks and create health check jobs for them
 * @param  {object}   data data from job
 * @param  {Function} done cb (err)
 */
HealthCheck.prototype.handle = function (data, cb) {
  var self = this;
  log.info(this.logData, 'HealthCheck handle');
  mavisClient.getDocks(function (err, docks) {
    if (err) {
      log.error(put({
        err: err
      }, self.logData), 'HealthCheck handle error getting docks');
      return cb();
    }

    docks.forEach(function (dockInfo) {
      log.info(this.logData, 'HealthCheck handle');
      rabbitmq.publishDockerHealthCheck({
        dockerHost: dockInfo.host,
        githubId: parseInt(dockInfo.tags)
      });
    });
    cb();
  });
};

/**
 * always return true because there is no data to validate
 * @return {Boolean} true
 */
HealthCheck.prototype.isDataValid = function () {
  return true;
};
