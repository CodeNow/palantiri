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

const util = require('util')

const BaseWorker = require('./base-worker')
const logger = require('../external/logger')()
const Swarm = require('../external/swarm')
const rabbitmq = require('../external/rabbitmq')

module.exports = HealthCheck

function HealthCheck () {
  const log = logger.child({
    method: 'HealthCheck constructor'
  })
  log.info('call')
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
  const log = logger.child({
    data: self.logData,
    method: 'handle'
  })
  log.info('call')
  const swarm = new Swarm()
  swarm.getNodes().asCallback(function (err, nodes) {
    if (err) {
      log.error({ err: err }, 'HealthCheck error getting docks')
      return cb(err)
    }
    log.info({
      nodesCount: (nodes || []).length
    }, 'get nodes success')
    nodes.forEach(function (node) {
      log.info('HealthCheck node handle')
      var githubId = node.Labels.org

      if (!githubId) {
        log.warn('HealthCheck no github id found, using default')
        githubId = 'default'
      } else {
        githubId = parseInt(githubId, 10)
      }
      rabbitmq.publishDockerHealthCheck({
        dockerHost: 'https://' + node.Host,
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
