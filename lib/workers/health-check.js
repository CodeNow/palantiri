/**
 * publishes all health related jobs
 *
 * This worker should
 *   create docker health jobs for each healthy host
 *
 * @module lib/workers/health-check
 */
'use strict'
require('loadenv')()

var util = require('util')
var put = require('101/put')

var BaseWorker = require('./base-worker.js')
var log = require('../external/logger.js')(__filename)
var mavisClient = require('../external/mavis.js')
var rabbitmq = require('../external/rabbitmq.js')

module.exports = HealthCheck

function HealthCheck () {
  log.info('HealthCheck constructor')
  BaseWorker.call(this, {
    name: 'health-check'
  })
}

util.inherits(HealthCheck, BaseWorker)

/**
 * creates handler for queue subscribe
 * @param  {object}   data data from job
 * @param  {Function} cb   (null)
 */
HealthCheck.worker = function (data, cb) {
  var healthCheck = new HealthCheck()
  healthCheck.worker(data, cb)
}

/**
 * queries mavis for docks and create health check jobs for them
 * @param  {object}   data data from job
 * @param  {Function} done cb (err)
 */
HealthCheck.prototype.handle = function (data, cb) {
  var self = this
  log.info(self.logData, 'HealthCheck handle')
  mavisClient.getDocks(function (err, docks) {
    if (err) {
      log.error(put({
        err: err
      }, self.logData), 'HealthCheck handle error getting docks')
      return cb(err)
    }

    docks.forEach(function (dockInfo) {
      log.info(self.logData, 'HealthCheck handle')
      var githubId = dockInfo.tags.split(',').reduce(function (prev, current) {
        return prev || parseInt(current)
      }, null)

      if (!githubId) {
        log.warn(self.logData, 'HealthCheck no github id found, using default')
        githubId = 'default'
      }

      rabbitmq.publishDockerHealthCheck({
        dockerHost: dockInfo.host,
        githubId: githubId
      })
    })
    cb()
  })
}

/**
 * always return true because there is no data to validate
 * @return {Boolean} true
 */
HealthCheck.prototype.isDataValid = function () {
  return true
}
