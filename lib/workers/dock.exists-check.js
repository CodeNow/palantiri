/**
  * Handles `dock.exists-check` event
  * @module lib/workers/dock.exists-check
  */
'use strict'

const Docker = require('../external/docker')
const Swarm = require('../external/swarm')
const DockerUtils = require('@runnable/loki').Utils
const WorkerError = require('error-cat/errors/worker-error')

const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.dockEventSchema

module.exports.task = (job) => {
  const log = logger.child({
    method: 'dock.exists-check'
  })
  const docker = new Docker(job.host)
  return docker.killContainerAsync('swarm')
    .catch(() => {
      // ignore error
    })
    .then(() => {
      log.trace('swarmHostExistsAsync')
      const swarm = new Swarm()
      return swarm.swarmHostExistsAsync(DockerUtils.toDockerUrl(job.host))
    })
    .then((doesExist) => {
      if (doesExist) {
        throw new WorkerError('dock still exists', {
          job: job
        })
      }
      rabbitmq.publishEvent('dock.removed', job)
    })
}
