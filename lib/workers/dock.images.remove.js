'use strict'

const Docker = require('../external/docker')
const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.dockEventSchema

module.exports.maxNumRetries = 2

const log = logger.child({ module: 'dock.images.remove' })

function publishImageJobs (image, job) {
  const userImageTag = image.RepoTags && image.RepoTags.find((i) => {
    return ~i.indexOf(process.env.USER_REGISTRY)
  })

  if (userImageTag) {
    log.trace({ image }, 'user tag found, pushing')
    return rabbitmq.publishTask('dock.image.push', {
      imageTag: userImageTag,
      host: job.host
    })
  }

  log.trace({ image }, 'no tag found, removing')
  return rabbitmq.publishTask('dock.image.remove', {
    imageTag: image.Id,
    host: job.host
  })
}

/**
 * get list of images on host and emit push jobs
 * @param  {DockDiskFull} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  const docker = new Docker(job.host)

  return docker.listImages()
  .tap((images) => {
    log.trace(`found ${images.length} images to delete`)
  })
  .each((image) => {
    return publishImageJobs(image, job)
  })
  .return()
}
