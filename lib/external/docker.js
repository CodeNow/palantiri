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
var url = require('url');

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
  log.info('docker certificates loaded');
} catch (e) {
  log.warn({err: e}, 'cannot load certificates for docker!!');
  // use all or none - so reset certs here
  certs = {};
}

module.exports = Docker;

/**
 * class used to talk to docker
 * @param {string} host docker host, format: http://hostname:hostport
 */
function Docker (host) {
  var parsedHost = url.parse(host);

  this.client = new Dockerode(put({
    host: parsedHost.hostname,
    port: parsedHost.port
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
  }, this.client.createContainer.bind(this.client, opts), cb);
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
  }, container.start.bind(container), cb);
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
  }, container.remove.bind(container), cb);
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
      follow: true,
      stdout: true,
      stderr: true
    }, function (err, stream) {
      if (err) { return callback(err); }
      var logBuffer = '';
      var logErrorBuffer = '';

      container.modem.demuxStream(stream, {
        write: function (data) {
          data = data.toString();
          log.trace(put({ log: data }, self.logData), 'stdout data');
          logBuffer += data;
        }
      }, {
        write: function (data) {
          data = data.toString();
          log.trace(put({ log: data }, self.logData), 'stderr data');
          logErrorBuffer += data;
        }
      });

      stream.on('end', function () {
        log.trace(put({
          log: logBuffer,
          err: logErrorBuffer
        }, self.logData), 'Docker containerLogs returned');
        if (logErrorBuffer) { return callback(logErrorBuffer); }

        callback(null, logBuffer);
      });
    });
  }, cb);
};
