/**
  * Handles `dock.wait-for-removal` event
  * @module lib/workers/dock.exists-check
  */
'use strict'

const Docker = require('../external/docker.js')
const joi = require('joi')
const Swarm = require('../external/swarm.js')
const WorkerError = require('error-cat/errors/worker-error')

const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq.js')

module.exports.jobSchema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  tid: joi.string()
}).label('job')

module.exports.task = (job) => {
  const log = logger.child({
    method: 'dock.exists-check',
    job: job
  })
  log.info('dock.exists-check call')
  const docker = new Docker(job.host)
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
      rabbitmq.publishEvent('dock.removed', {
        host: job.host
      })
    })
}
