'use strict'

const Docker = require('../external/docker')
const Helpers = require('./shared/helpers')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.imageActionSchema

module.exports.maxNumRetries = 5

/**
 * Remove given image from dock
 * @param  {ImagePush} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  return Helpers.ensureDockExists(job.host)
    .then(() => {
      const docker = new Docker(job.host)
      return docker.removeImage(job.imageTag)
        .catch(Helpers.handleDockerError)
    })
}
