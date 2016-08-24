'use strict'
const joi = require('joi')

const Docker = require('../external/docker.js')
const Helpers = require('./shared/helpers')
const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq.js')

module.exports.jobSchema = joi.object({
  host: joi.string().required(),
  tid: joi.string()
}).unknown().label('job')

module.exports.maxNumRetries = 5

/**
 * get list of images on host and emit push jobs
 * @param  {DockDiskFull} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  const log = logger.child({ module: 'dock.disk.filled' })
  return Helpers.ensureDockExists(job.host)
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

      rabbitmq.publishTask('image.push', {
        imageTag: userImageTag,
        host: job.host
      })
    })
}
