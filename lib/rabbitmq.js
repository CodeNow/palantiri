/**
 * RabbitMQ job management
 * @module lib/models/rabbitmq/hermes
 */
'use strict';

require('loadenv')();
var hermesClient = require('hermes-private');
var put = require('101/put');
var uuid = require('uuid');
var async = require('async');

var log = require('./logger.js')(__filename);
var error = require('error-cat');
var HealthCheck = require('./workers/health-check.js');
var DockerHealthCheck = require('./workers/docker-health-check.js');

/**
 * @class
 */
function RabbitMQ () {
  log.info('RabbitMQ constructor');
  this.hermesClient = null;
}

/**
 * Initiate connection to RabbitMQ server
 * Can be run synchronously, publish/subscribe invokations will be queued
 * Optional callback behavior
 * @param {Function} cb - optional callback
 * @return null
 */
RabbitMQ.prototype.connect = function (cb) {
  var opts = {
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME
  };

  log.info(opts, 'RabbitMQ.prototype.connect');
  this.hermesClient = hermesClient
    .hermesSingletonFactory(opts)
    .connect(cb);
};

/**
 * load all workers and subscribe to queues
 * Does not need to wait for hermesClient.on('ready'), hermes queues subscriptions
 * @return null
 */
RabbitMQ.prototype.loadWorkers = function () {
  log.info('RabbitMQ.prototype.loadWorkers');
  this.hermesClient.subscribe('health-check', function (data, cb) {
    var healthCheck = new HealthCheck();
    healthCheck.worker(data, cb);
  });

  this.hermesClient.subscribe('docker-health-check', function (data, cb) {
    var dockerHealthCheck = new DockerHealthCheck();
    dockerHealthCheck.worker(data, cb);
  });
};

/**
 * unsubscribe from queues
 * @param {Function} cb
 * @return null
 */
RabbitMQ.prototype.unloadWorkers = function (cb) {
  var self = this;
  log.info('RabbitMQ.prototype.unloadWorkers');
  async.parallel([
    function (cb) {
      log.trace('RabbitMQ.prototype.unloadWorkers docker-health-check');
      self.hermesClient.unsubscribe('docker-health-check', null, cb);
    },
    function (cb) {
      log.trace('RabbitMQ.prototype.unloadWorkers health-check');
      self.hermesClient.unsubscribe('health-check', null, cb);
  }], function (err) {
    log.trace('RabbitMQ.prototype.unloadWorkers complete');
    cb(err);
  });
};

/**
 * publish health-check event
 * @param  {object} data    data to publish to channel
 */
RabbitMQ.prototype.publishHealthCheck = function (data) {
  data = put({
    timestamp: new Date(),
    healthCheckId: uuid()
  }, data);

  log.info(data, 'RabbitMQ.prototype.publishHealthCheck');
  this.hermesClient.publish('health-check', data);
};

/**
 * publish docker-health-check event
 * @param  {object} data    data to publish to channel
 */
RabbitMQ.prototype.publishDockerHealthCheck = function (data) {
  data = put({
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  }, data);

  RabbitMQ._dataCheck(data, ['dockerHost', 'githubId']);
  log.info(data, 'RabbitMQ.prototype.publishDockerHealthCheck');
  this.hermesClient.publish('docker-health-check', data);
};

/**
 * publish on-dock-unhealthy event
 * @param  {object} data    data to publish to channel
 */
RabbitMQ.prototype.publishOnDockUnhealthy = function (data) {
  data = put({
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  }, data);

  RabbitMQ._dataCheck(data, ['host', 'githubId']);
  log.info(data, 'RabbitMQ.prototype.publishDockerHealthCheck');
  this.hermesClient.publish('on-dock-unhealthy', data);
};

RabbitMQ._dataCheck = function (data, args) {
  args.forEach(function (arg) {
    if (!data[arg]) {
      throw error.create(400, 'data requires ' + arg);
    }
  });
};

module.exports = new RabbitMQ();
