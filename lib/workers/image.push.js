'use strict'
const joi = require('joi')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const monitorDog = require('monitor-dog')

const Docker = require('../external/docker.js')
const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq.js')
const Swarm = require('../external/swarm')

module.exports.jobSchema = joi.object({
  imageTag: joi.string().required(),
  host: joi.string().ip().required(),
  tid: joi.string()
}).unknown().label('job')

/**
 * get list of images on host and emit push jobs
 * @param  {ImagePush} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  const log = logger.child({ module: 'image.push' })
  const swarm = new Swarm()
  log.info('image.push called')
  return swarm.swarmHostExistsAsync(job.host)
    .then((doesExist) => {
      if (!doesExist) {
        throw new WorkerStopError('dock does not exist', {
          job: job
        })
      }
    })
    .then(() => {
      const docker = new Docker(job.host)
      const timer = monitorDog.timer('image.push', [{ host: job.host }])
      log.trace('starting push')
      return docker.pushImage(job.imageTag)
        .return(timer)
    })
    .then((timer) => {
      timer.stop()
      log.trace('push complete')
      rabbitmq.publishTask('image.remove', {
        host: job.host,
        imageTag: job.imageTag
      })
    })
}
