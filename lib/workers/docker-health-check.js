/**
 * handles docker health check
 *
 * This worker should
 *   check the health of docker host provided
 *
 * @module lib/workers/docker-health-check
 */
'use strict';
require('loadenv')();

var async = require('async');
var error = require('error-cat');
var monitorDog = require('monitor-dog');
var put = require('101/put');
var util = require('util');

var BaseWorker = require('./base-worker.js');
var log = require('../external/logger.js')(__filename);
var Docker = require('../external/docker.js');
var rabbitmq = require('../external/rabbitmq.js');

module.exports = DockerHealthCheck;

function DockerHealthCheck () {
  log.info('DockerHealthCheck constructor');
  BaseWorker.call(this, {
    name: 'docker-health-check'
  });
}

util.inherits(DockerHealthCheck, BaseWorker);

/**
 * creates handler for queue subscribe
 * @param  {object}   data data from job
 * @param  {Function} cb   (err)
 */
DockerHealthCheck.worker = function (data, cb) {
  var dockerHealthCheck = new DockerHealthCheck();
  dockerHealthCheck.worker(data, cb);
};

/**
 * queries mavis for docks and create health check jobs for them
 * @param  {object}   data data from job
 * @param  {Function} done cb (err)
 */
DockerHealthCheck.prototype.handle = function (data, cb) {
  log.info(this.logData, 'DockerHealthCheck handle');

  this.dockerHost = data.dockerHost;
  this.dockerClient = new Docker(this.dockerHost);
  this.githubId = data.githubId;
  var self = this;

  async.series([
    this.pullInfoContainer.bind(this),
    this.createInfoContainer.bind(this),
    this.startInfoContainer.bind(this),
    this.readInfoContainer.bind(this),
    this.reportData.bind(this),
    this.removeInfoContainer.bind(this)
  ], function (err) {
    if (err) {
      self.checkErrorForMemoryFailure(err);
    }
    cb(err);
  });
};

/**
 * pull latest runnable/libra image
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.pullInfoContainer = function (cb) {
  var self = this;
  log.info(self.logData, 'DockerHealthCheck pullInfoContainer');
  self.dockerClient.pullImage(process.env.INFO_IMAGE, function (err) {
    if (err) {
      log.error(put({
        err: err
      }, self.logData), 'DockerHealthCheck pullInfoContainer error');
    }
    cb(err);
  });
};

/**
 * creates container that gets docker process info
 * and sets this.container
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.createInfoContainer = function (cb) {
  var self = this;
  log.info(self.logData, 'DockerHealthCheck createInfoContainer');
  self.dockerClient.createContainer({
    Image: process.env.INFO_IMAGE,
    Labels: {
      type: 'docker-health-check'
    },
    Env: [
      'LOOKUP_CMD=/docker',
      'LOOKUP_ARGS=-d'
    ],
    HostConfig: {
      Privileged: true,
      PidMode: 'host'
    }
  }, function (err, container) {
    if (err) {
      log.error(put({
        err: err
      }, self.logData), 'DockerHealthCheck createInfoContainer error');
    }

    self.container = container;
    cb(err);
  });
};

/**
 * starts container that gets docker process info
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.startInfoContainer = function (cb) {
  var self = this;
  log.info(this.logData, 'DockerHealthCheck startInfoContainer');
  self.dockerClient.startContainer(self.container, function (err) {
    if (err) {
      log.error(put({
        err: err
      }, self.logData), 'DockerHealthCheck startInfoContainer error');
    }

    cb(err);
  });
};

/**
 * removes container that got docker process info
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.removeInfoContainer = function (cb) {
  var self = this;
  log.info(self.logData, 'DockerHealthCheck removeInfoContainer');
  self.dockerClient.removeContainer(self.container, function (err) {
    if (err) {
      log.error(put({
        err: err
      }, self.logData), 'DockerHealthCheck removeInfoContainer error');
    }

    cb(err);
  });
};

/**
 * gets output of the container and parses into json format
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.readInfoContainer = function (cb) {
  var self = this;
  log.info(self.logData, 'DockerHealthCheck readInfoContainer');
  self.dockerClient.containerLogs(self.container, function (err, logs) {
    if (err) {
      log.error(put({
        err: err
      }, self.logData), 'DockerHealthCheck readInfoContainer error');
      return cb(err);
    }

    try {
      self.containerLogs = JSON.parse(logs);
    } catch (err) {
      log.error(put({
        err: err
      }, self.logData), 'DockerHealthCheck readInfoContainer parse error');
      return cb(err);
    }

    if (self.containerLogs.error) {
      return cb(error.create(502, 'info container returned error: ' +
        self.containerLogs.error));
    }

    cb(null);
  });
};

/**
 * sends data to datadog and create unhealthy job if memory usage high
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.reportData = function (cb) {
  var self = this;
  log.info(self.containerLogs, 'docker info');
  var data = self.containerLogs.info;

  Object.keys(data).forEach(function (key) {
    // first sanitize data
    data[key] = parseInt(data[key]);
    monitorDog.gauge(key, data[key], ['dockerHost:' + self.dockerHost]);
  });

  if (data.VmRSS >= process.env.RSS_LIMIT) {
    rabbitmq.publishOnDockUnhealthy({
      githubId: self.githubId,
      host: self.dockerHost
    });
  }

  cb(null);
};

/**
 * ensure githubId and dockerHost present
 * @param  {object} data ensure required data is present
 * @return {Boolean} true if data valid, else false
 */
DockerHealthCheck.prototype.isDataValid = function (data) {
  if (!data.dockerHost || !data.githubId) {
    return false;
  }
  return true;
};

/**
 * Checks the error result to see if it contains the Cannot Allocate Memory message
 * @param err stdError or Error object to check
 */
DockerHealthCheck.prototype.checkErrorForMemoryFailure = function (err) {
  var message = (typeof err === 'string') ? err : err.message;
  log.error(put({
    err: err,
    message: message
  }, this.logData), 'DockerHealthCheck checkErrorForMemoryFailure');
  if (message.indexOf('cannot allocate memory') > -1) {
    var errorCat = new error();
    errorCat.createAndReport(503, message, this.logData);
    rabbitmq.publishOnDockUnhealthy({
      githubId: this.githubId,
      host: this.dockerHost
    });
  }
};

