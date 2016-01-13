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
var ErrorCat = require('error-cat');
var includes = require('101/includes');
var monitorDog = require('monitor-dog');
var put = require('101/put');
var util = require('util');

var BaseWorker = require('./base-worker.js');
var Docker = require('../external/docker.js');
var log = require('../external/logger.js')(__filename);
var mavis = require('../external/mavis.js');
var rabbitmq = require('../external/rabbitmq.js');

var error = new ErrorCat();
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
  var self = this;
  log.info(this.logData, 'DockerHealthCheck handle');

  self.dockerHost = data.dockerHost;
  self.dockerClient = new Docker(self.dockerHost);
  self.githubId = data.githubId;

  async.series([
    self.ensureDockExist.bind(self),
    self.pullInfoContainer.bind(self),
    self.createInfoContainer.bind(self),
    self.startInfoContainer.bind(self),
    self.readInfoContainer.bind(self),
    self.reportData.bind(self),
    self.removeInfoContainer.bind(self)
  ], function (err) {
    if (err) {
      self.checkErrorForMemoryFailure(err);
    }
    cb(err);
  });
};

/**
 * ensure this dock is still in rotation
 * @param  {Function} cb (err)
 */
DockerHealthCheck.prototype.ensureDockExist = function (cb) {
  var self = this;

  mavis.getDocks(function (err, docks) {
   if (err) {
      log.error(put({ err: err }, self.logData), 'ensureDockExist getDocks error');
      return cb(err);
    }

    if (!includes(docks, self.dockerHost)) {
      log.warn(self.logData, 'ensureDockExist dock no longer exist');
      return cb(error.create(400, 'dock no longer exist', self.logData))
    }

    return cb();
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
  if (/cannot allocate memory/.test(message)) {
    error.createAndReport(503, message, this.logData);
    rabbitmq.publishOnDockUnhealthy({
      githubId: this.githubId,
      host: this.dockerHost
    });
  }
};

