'use strict'

const Docker = require('../external/docker')
const Helpers = require('./shared/helpers')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.imageActionSchema

module.exports.maxNumRetries = 2

/**
 * Remove given image from dock
 * @param  {ImagePush} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  const docker = new Docker(job.host)

  return docker.removeImage(job.imageTag)
  .catch(Helpers.handleDockerError)
}
