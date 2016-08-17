'use strict'

const Promise = require('bluebird')
const joi = Promise.promisifyAll(require('joi'))

const rabbitmq = require('../external/rabbitmq')

module.exports.jobSchema = joi.object({
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
module.exports.task = (job) => {
  return Promise
    .try(() => {
      rabbitmq.publishASGCheckCreated(job)
    })
}
