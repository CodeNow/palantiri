'use strict'

const Docker = require('../external/docker')
const Helpers = require('./shared/helpers')
const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.dockEventSchema

module.exports.maxNumRetries = 5

const log = logger.child({ module: 'dock.disk.filled' })

function publishImageJobs (image, job) {
  // if bad image return do not throw.
  if (!image.RepoTags) {
    log.trace({ image }, 'ignore, RepoTags not found')
    return
  }
  const userImageTag = image.RepoTags.find((i) => {
    return ~i.indexOf(process.env.USER_REGISTRY)
  })

  if (userImageTag) {
    log.trace({ image }, 'user tag found, pushing')
    return rabbitmq.publishTask('image.push', {
      imageTag: userImageTag,
      host: job.host
    })
  }

  // untagged images have RepoTags: ["<none>:<none>"]. They can be deleted
  const untagged = image.RepoTags.find((i) => {
    return ~i.indexOf('none')
  })

  if (untagged) {
    log.trace({ image }, 'no tag found, removing')
    return rabbitmq.publishTask('image.remove', {
      imageTag: image.Id,
      host: job.host
    })
  }

  log.trace({ image: image }, 'ignore, not a user image or untagged image')
}

function publishVolumeJobs (volume, host) {
  log.trace({ volume }, 'deleting volume')
  return rabbitmq.publishTask('volume.delete', { host, volume })
}

/**
 * get list of images on host and emit push jobs
 * @param  {DockDiskFull} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  return Helpers.ensureDockExists(job.host)
    .then(() => {
      const docker = new Docker(job.host)
      return docker.listImages()
        .each(image => publishImageJobs(image, job))
        .then(() => docker.listDanglingVolumes())
        .each(volume => publishVolumeJobs(volume, job.host))
    })
    .return()
}
