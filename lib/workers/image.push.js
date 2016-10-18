'use strict'
const monitorDog = require('monitor-dog')

const Docker = require('../external/docker')
const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq')
const schemas = require('../external/schemas')
const Helpers = require('./shared/helpers')

module.exports.jobSchema = schemas.imageActionSchema

module.exports.maxNumRetries = 5

/**
 * get list of images on host and emit push jobs
 * @param  {ImagePush} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  const log = logger.child({ module: 'image.push' })
  return Helpers.ensureDockExists(job.host)
    .then(() => {
      const docker = new Docker(job.host)
      const timer = monitorDog.timer('image.push', [{ host: job.host }])
      log.trace('starting push')
      return docker.pushImage(job.imageTag)
        .catch(Helpers.handleDockerError)
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
