/**
 * @module lib/workers/base
 */
'use strict';

var error = require('error-cat');
var put = require('101/put');
var domain = require('domain');

var log = require('./../external/logger.js')(__filename);

module.exports = BaseWorker;

/**
 * base class for all workers
 * handle and validate should be override
 */
function BaseWorker () {
  if (!this.name) {
    throw error.create('worker needs name');
  }

  this.logData = {
    name: this.name
  };

  log.info(this.logData, 'BaseWorker');
}

/**
 * in charge of wrapping handle in domain and ensuring cb is called
 * @param  {object}   data data from job
 * @param  {Function} cb (null)
 */
BaseWorker.prototype.worker = function (data, cb) {
  var self = this;
  self.logData = put(self.logData, data);

  var workerDomain = domain.create();
  workerDomain.on('error', function (err) {
    self.handleDomainError(err);
    // ack job and clear to prevent loop
    cb();
  });
  workerDomain.run(function () {
    log.info(self.logData, self.name + ' start');

    if (self.isDataValid(data)) {
      self.handle(data, function (err) {
        if (err) {
          log.fatal(put({
            err: err,
          }, this.logData), this.name + ' handle error');
        }
        cb();
      });
    } else {
      self.handle(error.create('job data invalid'));
      cb();
    }
  });
};

/**
 * REQUIRED: function which handles job
 * @param  {object}   data data from job
 * @param  {Function} cb cb (err)
 */
BaseWorker.prototype.handle = function () {
  throw error.create('handle needs to be implemented for worker');
};

/**
 * REQUIRED: function which validated input data
 * @return {Boolean} true if data is valid, else false
 */
BaseWorker.prototype.isDataValid = function () {
  throw error.create('isDataValid needs to be implemented for worker');
};

/**
 * ran when a domain error is encountered
 * @param  {object} err error object
 */
BaseWorker.prototype.handleDomainError = function (err) {
  log.fatal(put({
    err: err
  }, this.logData), this.name + ' domain error');
};
