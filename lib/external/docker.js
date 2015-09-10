/**
 * Docker API requests
 * @module lib/external/docker
 */
'use strict';
require('loadenv')();

var async = require('async');
var Dockerode = require('dockerode');
var put = require('101/put');
var fs = require('fs');
var join = require('path').join;

var log = require('./logger.js')(__filename);

// try/catch is a better pattern for this, since checking to see if it exists
// and then reading files can lead to race conditions (unlikely, but still)
var certs = {};
try {
  // DOCKER_CERT_PATH is docker's default thing it checks - may as well use it
  var certPath = process.env.DOCKER_CERT_PATH || '/etc/ssl/docker';
  certs.ca = fs.readFileSync(join(certPath, '/ca.pem'));
  certs.cert = fs.readFileSync(join(certPath, '/cert.pem'));
  certs.key = fs.readFileSync(join(certPath, '/key.pem'));
} catch (e) {
  log.warn({err: e}, 'cannot load certificates for docker!!');
  // use all or none - so reset certs here
  certs = {};
}

module.exports = Docker;

/**
 * class used to talk to docker
 */
function Docker (host) {
  this.client = new Dockerode(put({
    host: host,
  }, certs));
  this.logData = {
    host: host
  };
}

/**
 * create docker container
 * @param  {Function} cb (err, container)
 */
Docker.prototype.createContainer = function (opts, cb) {
  log.info(this.logData, 'Docker createContainer');
  async.retry({
    times: process.env.DOCKER_RETRY_ATTEMPTS,
    interval: process.env.DOCKER_RETRY_INTERVAL
  }, this.client.createContainer.bind(this, opts), cb);
};

/**
 * start docker container
 * @param  {object} container dockerode container object
 * @param  {Function} cb (err)
 */
Docker.prototype.startContainer = function (container, cb) {
  log.info(this.logData, 'Docker startContainer');
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
  log.info(this.logData, 'Docker removeContainer');
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
  var self = this;
  log.info(self.logData, 'Docker containerLogs');
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

      var logBuffer = '';

      stream.on('error', callback);
      stream.on('data', function (data) {
        logBuffer += data;
      });
      stream.on('end', function () {
        log.trace(put({
          log: logBuffer
        }, self.logData), 'Docker containerLogs returned');

        callback(null, logBuffer);
      });
    });
  }, cb);
};
