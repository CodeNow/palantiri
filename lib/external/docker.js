/**
 * Docker API requests
 * @module lib/external/docker
 */
'use strict';

var async = require('async');
var Dockerode = require('dockerode');

module.exports = Docker;

/**
 * class used to talk to docker
 */
function Docker (host) {
  this.client = new Dockerode(host);
}

/**
 * create docker container
 * @param  {Function} cb (err, container)
 */
Docker.prototype.createContainer = function (opts, cb) {
  async.retry({
    times: process.env.DOCKER_RETRY_ATTEMPTS,
    interval: process.env.DOCKER_RETRY_INTERVAL
  }, this.createContainer.bind(this, opts), cb);
};

/**
 * start docker container
 * @param  {object} container dockerode container object
 * @param  {Function} cb (err)
 */
Docker.prototype.startContainer = function (container, cb) {
  async.retry({
    times: process.env.DOCKER_RETRY_ATTEMPTS,
    interval: process.env.DOCKER_RETRY_INTERVAL
  }, container.start.bind(this), cb);
};

/**
 * remove docker container
 * @param  {object} container dockerode container object
 * @param  {Function} cb (err)
 */
Docker.prototype.removeContainer = function (container, cb) {
  async.retry({
    times: process.env.DOCKER_RETRY_ATTEMPTS,
    interval: process.env.DOCKER_RETRY_INTERVAL
  }, container.remove.bind(this), cb);
};

/**
 * get logs from container
 * @param  {object} container dockerode container object
 * @param  {Function} cb (err, logs)
 */
Docker.prototype.containerLogs = function (container, cb) {
  async.retry({
    times: process.env.DOCKER_RETRY_ATTEMPTS,
    interval: process.env.DOCKER_RETRY_INTERVAL
  }, function (callback) {
    container.logs({
      follow: false,
      stdout: true,
      stderr: true
    }, function (err, stream) {
      if (err) { return callback(err); }

      var log = '';

      stream.on('error', callback);
      stream.on('data', function (data) {
        log += data;
      });
      stream.on('end', function () {
        callback(null, log);
      });
    });
  }, cb);
};
