/**
 * Mavis API requests
 * @module lib/external/mavis
 */
'use strict';

var request = require('requestretry');

module.exports = function () {
  return new Mavis();
};

/**
 * class used to talk to mavis
 */
function Mavis () {
  this.host = process.env.MAVIS_HOST;
}

/**
 * fetches list of docks from mavis server
 * @param {Function} cb (err, docksArray)
 */
Mavis.prototype.getDocks = function (cb) {
  request({
    url: this.host + '/docks',
    json: true,
    retryDelay: process.env.MAVIS_RETRY_DELAY,
    retryStrategy: request.RetryStrategies.NetworkError
  }, function (err, res, body) {
    if (err) { return cb(err); }
    var docks;
    try {
      docks = JSON.parse(body);
    } catch (err) {
      return cb(err);
    }

    cb(null, docks);
  });
};
