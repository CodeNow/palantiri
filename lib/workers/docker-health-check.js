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

var async = require('async');
var util = require('util');
var monitorDog = require('monitor-dog');
var put = require('101/put');

var BaseWorker = require('./base-worker.js');
var log = require('./../logger.js')(__filename);
var Docker = require('../external/docker.js');
var rabbitmq = require('../../rabbitmq.js');
var error = require('error-cat');

module.exports = new DockerHealthCheck();

function DockerHealthCheck () {
  log.info('DockerHealthCheck constructor');
  this.name = 'health-check';
  BaseWorker.apply(this, arguments);
}

util.inherits(DockerHealthCheck, BaseWorker);

/**
 * queries mavis for docks and create health check jobs for them
 * @param  {object}   data data from job
 * @param  {Function} done cb ()
 */
DockerHealthCheck.prototype.handle = function (data, cb) {
  log.info(this.logData, 'DockerHealthCheck handle');

  this.dockerClient = new Docker(data.dockerHost);
  this.githubId = data.githubId;

  async.series([
    this.createInfoContainer.bind(this),
    this.startInfoContainer.bind(this),
    this.readInfoContainer.bind(this),
    this.reportData.bind(this),
    this.removeInfoContainer.bind(this),
  ], function (err) {
    if (err) {
      error.log(err);
    }

    cb(null);
  });
};

/**
 * creates container that gets docker process info
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.createInfoContainer = function (cb) {
  var self = this;
  self.dockerClient.createContainer({
    Image: 'runnable/libra',
    Cmd: ['sleep', '9999999'],
    Labels: {
      type: 'docker-health-check'
    },
    HostConfig: {
      Privileged: true,
      PidMode: 'host'
    }
  }, function (err, container) {
    if (err) {
      log.error(put({
        err: err
      }, this.logData), 'DockerHealthCheck createInfoContainer error');
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
  this.dockerClient.startContainer(this.container, function (err) {
    if (err) {
      log.error(put({
        err: err
      }, this.logData), 'DockerHealthCheck startInfoContainer error');
    }

    cb(err);
  });
};

/**
 * removes container that got docker process info
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.removeInfoContainer = function (cb) {
  this.dockerClient.removeContainer(this.container, function (err) {
    if (err) {
      log.error(put({
        err: err
      }, this.logData), 'DockerHealthCheck removeInfoContainer error');
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
  this.dockerClient.containerLogs(this.container, function (err, logs) {
    if (err) {
      log.error(put({
        err: err
      }, this.logData), 'DockerHealthCheck readInfoContainer error');
      return cb(err);
    }

    try {
      self.containerLogs = JSON.parse(logs);
    } catch (err) {
      log.error(put({
        err: err
      }, this.logData), 'DockerHealthCheck readInfoContainer parse error');
      return cb(err);
    }

    if (self.containerLogs.error) {
      return cb(error.createAndReport(502, 'info container returned error: ' +
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
  log.info(this.containerLogs, 'docker info');
  var data = this.containerLogs.info;

  Object.keys(data).forEach(function (key) {
    // first sanitize data
    data[key] = parseInt(data[key]);
    monitorDog.log(key, data[key]);
  });

  if (data.VmRSS >= process.env.RSS_LIMIT) {
    rabbitmq.publishOnDockUnhealthy({
      githubId: this.githubId,
      host: this.dockerHost
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
