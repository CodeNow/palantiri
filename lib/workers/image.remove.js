'use strict'
const joi = require('joi')

const Docker = require('../external/docker.js')
const Helpers = require('./shared/helpers')
const logger = require('../external/logger')()

module.exports.jobSchema = joi.object({
  imageTag: joi.string().required(),
  host: joi.string().ip().required(),
  tid: joi.string()
}).unknown().label('job')

module.exports.maxNumRetries = 5

/**
 * Remove given image from dock
 * @param  {ImagePush} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  const log = logger.child({ module: 'image.push' })
  log.info('image.push called')
  return Helpers.ensureDockExists(job.host)
    .then(() => {
      const docker = new Docker(job.host)
      return docker.removeImage(job.imageTag)
        .catch(Helpers.handleDockerError)
    })
}
