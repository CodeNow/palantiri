'use strict'

const Docker = require('../external/docker')
const Helpers = require('./shared/helpers')
const logger = require('../external/logger')()
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.volumeActionSchema

module.exports.maxNumRetries = 5

module.exports = {
  /**
   * Handle volume.remove when called on dangling volumes
   * @param {Object} job - Job info
   * @returns {Promise}
   */
  task (job) {
    const log = logger.child({ module: 'volume.remove' })
    const volumeName = job.volume.name
    log.info({ volumeName }, 'called')

    return Helpers.ensureDockExists(job.host)
      .then(() => {
        const docker = new Docker(job.host)
        return docker.removeVolume(volumeName)
      })
      .catch(Helpers.handleDockerError)
  }
}
