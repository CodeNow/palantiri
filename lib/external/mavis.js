/**
 * Mavis API requests
 * @module lib/external/mavis
 */
'use strict';
require('loadenv')();

var ErrorCat = require('error-cat');
var error = new ErrorCat();
var request = require('requestretry');
var put = require('101/put');

var log = require('./../external/logger.js')(__filename);

module.exports = new Mavis();

/**
 * class used to talk to mavis
 */
function Mavis () {
  this.host = process.env.MAVIS_HOST;
  this.logData = {
    host: this.host
  };
}

/**
 * fetches list of docks from mavis server
 * @param {Function} cb (err, docksArray)
 */
Mavis.prototype.getDocks = function (cb) {
  var self = this;
  log.info(self.logData, 'Mavis getDocks');
  request({
    url: this.host + '/docks',
    json: true,
    maxAttempts: process.env.MAVIS_RETRY_ATTEMPTS,
    retryDelay: process.env.MAVIS_RETRY_DELAY,
    retryStrategy: request.RetryStrategies.NetworkError
  }, function (err, res, body) {
    if (err) { return cb(error.wrap(err, 502, error.message)); }

    var docks;
    try {
      docks = JSON.parse(body);
    } catch (err) {
      return cb(error.wrap(err, 502, error.message));
    }

    log.trace(put({
      docks: docks
    }, self.logData), 'Mavis getDocks returned');

    cb(null, docks);
  });
};
