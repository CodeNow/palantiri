/**
  * Handles `dock.wait-for-removal` event
  * @module lib/workers/dock.wait-for-removal
  */
'use strict'

const Docker = require('../external/docker.js')
const joi = require('joi')
const Promise = require('bluebird')
const Swarm = require('../external/swarm.js')
const WorkerError = require('error-cat/errors/worker-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq.js')

const schema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  githubId: joi.string().required(),
  tid: joi.string()
}).required().label('job')

module.exports = (job) => {
  const log = logger.child({
    method: 'dock.exists-check',
    job: job
  })
  log.info('dock.exists-check call')
  return Promise.try(() => {
    joi.assert(job, schema)
  })
  .catch((err) => {
    throw new WorkerStopError(
      `Invalid Job: ${err.message}`,
      { validationError: err }
    )
  })
  .then(() => {
    log.trace('killContainerAsync')
    var docker = new Docker(job.host)
    return docker.killContainerAsync('swarm')
      .catch(() => {
        // ignore error
      })
      .then(() => {
        log.trace('swarmHostExistsAsync')
        const swarm = new Swarm()
        return swarm.swarmHostExistsAsync(job.host.replace('http://', ''))
      })
      .then((doesExist) => {
        if (doesExist) {
          throw new WorkerError('dock still exists', {
            job: job
          })
        }
        rabbitmq.publishDockRemoved({
          host: job.host,
          githubId: job.githubId
        })
      })
  })
}
