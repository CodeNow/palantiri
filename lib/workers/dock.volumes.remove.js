'use strict'

const Docker = require('../external/docker')
const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.dockEventSchema

module.exports.maxNumRetries = 2

const log = logger.child({ module: 'dock.volumes.remove' })

function publishVolumeJobs (volume, host) {
  log.trace({ volume }, 'deleting volume')
  return rabbitmq.publishTask('volume.delete', { host, volume })
}

/**
 * get list of volumes on host and emit delete jobs
 * @param  {DockDiskFull} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  const docker = new Docker(job.host)

  return docker.listDanglingVolumes()
  .tap((volumes) => {
    log.trace(`found ${volumes.length} volumes to delete`)
  })
  .each(volume => publishVolumeJobs(volume, job.host))
  .return()
}
