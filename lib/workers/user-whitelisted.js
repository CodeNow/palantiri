'use strict'

const Promise = require('bluebird')
const joi = Promise.promisifyAll(require('joi'))
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const logger = require('../external/logger')()
const rabbitmq = require('../external/rabbitmq')

const schema = joi.object({
  orgName: joi.string().required(),
  githubId: joi.number().required(),
  createdAt: joi.date().timestamp('unix').required() // CreatedAt is in seconds
}).required().label('job')

/**
 * Enqueue an `asg:check-created` job when an user (always an organization) is whiteliasted
 *
 * @param {Object} job           - job model
 * @param {Number} job.createdAt - Date time, in seconds of when this asg was created
 * @param {Number} job.githubId  - Organization's github id
 * @param {Number} job.orgName   - Organization's github login name
 *
 * @returns {Promise}            - That resolves when the job is complete and the other job is enqueued
 */
module.exports = function UserWhitelisted (job) {
  var log = logger.child({
    tx: true,
    data: job,
    method: 'UserWhitelisted'
  })
  log.info('UserWhitelisted called')

  return joi.validateAsync(job, schema)
    .catch((err) => {
      throw new WorkerStopError(
        `Invalid Job: ${err.message}`,
        { validationError: err }
      )
    })
    .then(() => {
      rabbitmq.publishASGCheckCreated(job)
    })
}
