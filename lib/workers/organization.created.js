'use strict'

const Promise = require('bluebird')
const rabbitmq = require('../external/rabbitmq')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.organizationCreated

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
      rabbitmq.publishTask('asg.check-created', job)
    })
}
