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
const ErrorCat = require('error-cat')

const logger = require('../external/logger')()
const Swarm = require('../external/swarm')
const rabbitmq = require('../external/rabbitmq')

module.exports = HealthCheck

function HealthCheck (job) {
  const log = logger.child({ method: 'HealthCheck' })
  log.info('HealthCheck call')
  const swarm = new Swarm()
  return swarm.getHostsWithOrgs()
    .then(function (nodes) {
      log.info({
        nodesCount: (nodes || []).length
      }, 'get nodes success')
      nodes.forEach(function (node) {
        log.info({ node: node }, 'HealthCheck node handle')
        try {
          rabbitmq.publishDockerHealthCheck({
            dockerHost: node.host,
            githubId: node.org
          })
        } catch (err) {
          // we do not want to stop the whole job for one error.
          // log and continue on your way
          log.error({ err: err, node: node }, 'invalid node')
          ErrorCat.report(err, { node: node })
        }
      })
    })
}
