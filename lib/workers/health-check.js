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

var BaseWorker = require('./base-worker')
var log = require('../external/logger')()
const Swarm = require('../external/swarm')
var rabbitmq = require('../external/rabbitmq')

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
  const swarm = new Swarm()
  swarm.getNodes(function (err, nodes) {
    if (err) {
      log.error(put({
        err: err
      }, self.logData), 'HealthCheck handle error getting docks')
      return cb(err)
    }

    nodes.forEach(function (node) {
      log.info(self.logData, 'HealthCheck handle')
      var githubId = node.Labels.org

      if (!githubId) {
        log.warn(self.logData, 'HealthCheck no github id found, using default')
        githubId = 'default'
      }

      rabbitmq.publishDockerHealthCheck({
        dockerHost: node.Host,
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
