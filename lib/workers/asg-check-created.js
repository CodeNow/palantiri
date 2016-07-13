/**
 * Gets the docks for a certain org to validate that the were created successfully
 */
'use strict'

// external
const Promise = require('bluebird')
const joi = Promise.promisifyAll(require('joi'))
const monitor = require('monitor-dog')
const TaskError = require('ponos').TaskError
const TaskFatalError = require('ponos').TaskFatalError
const moment = require('moment')

// internal
const logger = require('../external/logger')()
const Swarm = require('../external/swarm')

const schema = joi.object({
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
module.exports = function CheckASGWasCreated (job) {
  var log = logger.child({
    tx: true,
    data: job,
    method: 'CheckASGWasCreated'
  })
  log.info('CheckASGWasCreated called')

  return joi.validateAsync(job, schema)
    .catch((err) => {
      throw new TaskFatalError(
        'asg.check-created',
        'Invalid Job',
        { validationError: err }
      )
    })
    .then(() => {
      // Check if this job is ready
      // Using the `createdAt`, we can see if it's been enough time to check on the dock
      var createdAtTime = moment(job.createdAt * 1000) // Convert form UNIX to JS timestamp
      var asgCheckTime = createdAtTime.add(process.env.CHECK_ASG_CREATED_DELAY_IN_SEC, 'seconds')
      var now = moment()
      var timeLeftInSeconds = asgCheckTime.diff(now, 'seconds')
      if (timeLeftInSeconds >= 0) {
        // It hasn't been long enough, so let the exponential backoff handle repeating this job
        throw new TaskError(
          'asg.check-created',
          `Org \`'${job.githubId}'\` still needs to wait \`${timeLeftInSeconds}'\` seconds`
        )
      }
    })
    .then(() => {
      const swarm = new Swarm()
      return swarm.getHostsWithOrgs()
    })
    .then((docks) => {
      var dockExists = docks.find(function (dock) {
        return dock.org === job.githubId.toString()
      })
      if (!dockExists) {
        monitor.event({
          title: 'ASG Create Failed',
          text: `No docks were created for ${job.orgName}`
        })
        throw new TaskFatalError('CheckASGWasCreated', 'No Docks exist!')
      }
    })
}