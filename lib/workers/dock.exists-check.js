/**
  * Handles `dock.wait-for-removal` event
  * @module lib/workers/dock.wait-for-removal
  */
'use strict'

const joi = require('joi')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const WorkerError = require('error-cat/errors/worker-error')
const Docker = require('../external/docker.js')
const Swarm = require('../external/swarm.js')

const logger = require('./logger')()
const rabbitmq = require('../external/rabbitmq.js')

const schema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  githubId: joi.string().required(),
  tid: joi.string()
}).required().label('job')

module.exports = (job) => {
  const log = logger.child({ method: 'dock.exists-check', job: job })
  log.info('dock.exists-check call')
  return joi.validateAsync(job, schema)
    .catch((err) => {
      throw new WorkerStopError(
        `Invalid Job: ${err.message}`,
        { validationError: err }
      )
    })
    .then(() => {
      log.trace('killContainerAsync')
      var docker = new Docker(job.dockerUrl)
      return docker.killContainerAsync('swarm')
    })
    .finally(() => {
      log.trace('swarmHostExistsAsync')
      const swarm = new Swarm()
      return swarm.swarmHostExistsAsync(job.host)
    })
    .then((doesExist) => {
      if (doesExist) {
        throw new WorkerError('dock still exists', {
          job: job
        })
      }

      rabbitmq.publishDockRemoved({
        host: 'https://' + job.dockerUrl,
        githubId: job.githubId
      })
    })
}
