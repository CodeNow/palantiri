'use strict'

const joi = require('joi')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const Docker = require('../external/docker.js')
const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq.js')
const Swarm = require('../external/swarm')

module.exports.jobSchema = joi.object({
  host: joi.string().ip().required(),
  tid: joi.string()
}).unknown().label('job')

/**
 * get list of images on host and emit push jobs
 * @param  {DockDiskFull} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  const log = logger.child({ module: 'dock.disk.filled' })
  const swarm = new Swarm()

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
      return docker.listImages()
    })
    .each((image) => {
      // if bad image return do not throw.
      if (!image.RepoTags) {
        log.trace({ image: image }, 'ignore, RepoTags not found')
        return
      }
      const userImageTag = image.RepoTags.find((i) => {
        return ~i.indexOf(process.env.USER_REGISTRY)
      })
      if (!userImageTag) {
        log.trace({ image: image }, 'ignore, user tag not found')
        return
      }

      rabbitmq.publishPushImage({
        imageTag: userImageTag
      })
    })
}
