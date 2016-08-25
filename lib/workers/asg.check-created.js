/**
 * Gets the docks for a certain org to validate that the were created successfully
 */
'use strict'

// external
const Promise = require('bluebird')
const joi = require('joi')
const monitor = require('monitor-dog')
const WorkerError = require('error-cat/errors/worker-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const moment = require('moment')

// internal
const Swarm = require('../external/swarm')

module.exports.jobSchema = joi.object({
  orgName: joi.string().required(),
  githubId: joi.number().required(),
  createdAt: joi.date().timestamp('unix').required() // CreatedAt is in seconds
}).required().label('job')

/**
 * Validates that an org's asg was created successfully by checking that at least 1 dock exists
 *
 * @param {Object} job           - job model
 * @param {Number} job.createdAt - Date time, in seconds of when this asg was created
 * @param {Number} job.githubId  - Organization's github id
 * @param {Number} job.orgName   - Organization's github login name
 *
 * @returns {Promise}   That resolves when the job is complete, or needs to wait some more
 */
module.exports.task = (job) => {
  return Promise
    .try(() => {
      // Check if this job is ready
      // Using the `createdAt`, we can see if it's been enough time to check on the dock
      const createdAtTime = moment(job.createdAt * 1000) // Convert form UNIX to JS timestamp
      const asgCheckTime = createdAtTime.add(process.env.CHECK_ASG_CREATED_DELAY_IN_SEC, 'seconds')
      const now = moment()
      const timeLeftInSeconds = asgCheckTime.diff(now, 'seconds')
      if (timeLeftInSeconds >= 0) {
        // It hasn't been long enough, so let the exponential backoff handle repeating this job
        throw new WorkerError(
          `Org \`'${job.githubId}'\` still needs to wait \`${timeLeftInSeconds}'\` seconds`
        )
      }
    })
    .then(() => {
      const swarm = new Swarm()
      return swarm.getHostsWithOrgs()
    })
    .then((docks) => {
      const dockExists = docks.find((dock) => {
        return dock.org === job.githubId.toString()
      })
      if (!dockExists) {
        monitor.event({
          title: 'ASG Create Failed',
          text: `No docks were created for ${job.orgName}`
        })
        throw new WorkerStopError('No Docks exist!')
      }
    })
}
