'use strict'

const Helpers = require('./shared/helpers')
const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.dockEventSchema

module.exports.maxNumRetries = 2

const log = logger.child({ module: 'dock.disk.filled' })

/**
 * @param  {DockDiskFull} job schema above
 * @return {Promise}
 */
module.exports.task = (job) => {
  return Helpers.ensureDockExists(job.host)
  .then(() => {
    log.trace('publishing cleanup tasks', { job })

    rabbitmq.publishTask('dock.volumes.remove', job)
    rabbitmq.publishTask('dock.images.remove', job)
  })
  .return()
}
