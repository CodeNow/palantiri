/**
  * Handles `on-dock-unhealthy` event
  * @module lib/workers/on-dock-unhealthy
  */
'use strict'

const joi = require('joi')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const logger = require('./logger')()
const rabbitmq = require('../external/rabbitmq.js')

const schema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  githubId: joi.string().required()
}).required().label('job')

module.exports = (job) => {
  const log = logger.child({
    method: 'on-dock-unhealthy',
    job: job
  })
  log.info('on-dock-unhealthy called')
  return joi.validateAsync(job, schema)
    .catch((err) => {
      throw new WorkerStopError(
        `Invalid Job: ${err.message}`,
        { validationError: err }
      )
    })
    .then(() => {
      rabbitmq.publishDockExistsCheck({
        dockerUrl: job.host,
        githubId: job.githubId
      })
    })
}
