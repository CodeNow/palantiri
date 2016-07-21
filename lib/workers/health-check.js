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

const logger = require('../external/logger')()
const Swarm = require('../external/swarm')
const rabbitmq = require('../external/rabbitmq')

module.exports = HealthCheck

function HealthCheck (job) {
  const log = logger.child({
    method: 'HealthCheck'
  })
  log.info('call')
  const swarm = new Swarm()
  return swarm.getNodes()
    .then(function (nodes) {
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
    })
}
