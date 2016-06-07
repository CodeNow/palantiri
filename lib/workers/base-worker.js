/**
 * @module lib/workers/base
 */
'use strict'

var error = require('error-cat')
var put = require('101/put')
var domain = require('domain')

var log = require('../external/logger.js')()

module.exports = BaseWorker

/**
 * base class for all workers
 * handle and validate should be override
 */
function BaseWorker (data) {
  log.info(data, 'BaseWorker constructor')
  if (!data || !data.name) {
    throw error.create(400, 'worker needs name')
  }

  this.name = data.name
  this.logData = {
    name: this.name
  }
}

/**
 * in charge of wrapping handle in domain and ensuring cb is called
 * @param  {object}   data data from job
 * @param  {Function} cb (null)
 */
BaseWorker.prototype.worker = function (data, cb) {
  var self = this
  self.logData = put(self.logData, data)
  log.info(data, 'BaseWorker worker')

  var workerDomain = domain.create()
  workerDomain.on('error', function (err) {
    self.handleDomainError(err)
    // ack job and clear to prevent loop
    cb()
  })

  workerDomain.run(function () {
    log.info(self.logData, 'run')

    if (!self.isDataValid(data)) {
      error.create(400, 'job data invalid')
      log.error(data, 'BaseWorker worker')
      return cb()
    }

    self.handle(data, function (err) {
      if (err) {
        log.error(put({
          err: err
        }, self.logData), 'handle error')
      }
      cb()
    })
  })
}

/**
 * REQUIRED: function which handles job
 * @param  {object}   data data from job
 * @param  {Function} cb cb (err)
 */
BaseWorker.prototype.handle = function () {
  throw error.create(400, 'handle needs to be implemented for worker')
}

/**
 * REQUIRED: function which validated input data
 * @return {Boolean} true if data is valid, else false
 */
BaseWorker.prototype.isDataValid = function () {
  throw error.create(400, 'isDataValid needs to be implemented for worker')
}

/**
 * ran when a domain error is encountered
 * @param  {object} err error object
 */
BaseWorker.prototype.handleDomainError = function (err) {
  log.fatal(put({
    err: err
  }, this.logData), 'domain error')
}
