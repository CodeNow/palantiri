/**
 * handles docker health check
 *
 * This worker should
 *   check the health of docker host provided
 *
 * @module lib/workers/docker-health-check
 */
'use strict'
require('loadenv')()

const Promise = require('bluebird')
const CriticalError = require('error-cat/errors/critical-error')
const ErrorCat = require('error-cat')
const monitorDog = require('monitor-dog')
const joi = Promise.promisifyAll(require('joi'))
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const logger = require('../external/logger.js')()
const Docker = require('../external/docker.js')
const rabbitmq = require('../external/rabbitmq.js')

module.exports = DockerHealthCheck

const schema = joi.object({
  dockerHost: joi.string().required(),
  githubId: joi.string().required(),
  tid: joi.string()
}).required().label('job')

function DockerHealthCheck (job) {
  const log = logger.child({
    method: 'DockerHealthCheck'
  })
  log.info('call')
  return joi.validateAsync(job, schema)
    .catch((err) => {
      throw new WorkerStopError(
        `Invalid Job: ${err.message}`,
        { validationError: err }
      )
    })
    .then(function () {
      const dockerClient = new Docker(job.dockerHost)
      return dockerClient.pullImage(process.env.INFO_IMAGE)
    })
    .then(function () {
      const dockerClient = new Docker(job.dockerHost)
      return dockerClient.createContainer({
        Image: process.env.INFO_IMAGE,
        Labels: {
          type: 'docker-health-check'
        },
        Env: [
          'LOOKUP_CMD=/docker',
          'LOOKUP_ARGS=-d'
        ],
        HostConfig: {
          Privileged: true,
          PidMode: 'host'
        }
      })
    })
    .tap(function (container) {
      const dockerClient = new Docker(job.dockerHost)
      return dockerClient.startContainer(container)
    })
    .tap(function (container) {
      const dockerClient = new Docker(job.dockerHost)
      return dockerClient.containerLogs(container)
        .then(function (logs) {
          var containerLogs
          try {
            containerLogs = JSON.parse(logs)
          } catch (err) {
            log.error(err, 'DockerHealthCheck readInfoContainer parse error')
            throw new WorkerStopError('Invalid logs')
          }
          if (containerLogs.error) {
            throw new CriticalError('info container returned error: ' +
              containerLogs.error)
          }
          return containerLogs
        })
        .then(function (containerLogs) {
          // sends data to datadog and create unhealthy job if memory usage high
          var data = containerLogs.info || {}
          Object.keys(data).forEach(function (key) {
            // first sanitize data
            data[key] = parseInt(data[key], 10)
            monitorDog.gauge(key, data[key], ['dockerHost:' + job.dockerHost])
          })

          if (data.VmRSS >= process.env.RSS_LIMIT) {
            rabbitmq.publishOnDockUnhealthy({
              githubId: job.githubId,
              host: job.dockerHost
            })
          }
        })
    })
    .then(function (container) {
      const dockerClient = new Docker(job.dockerHost)
      return dockerClient.removeContainer(container)
    })
    .catch(CriticalError, function (err) {
      const message = (typeof err === 'string') ? err : err.message
      log.error({
        err: err,
        message: message
      }, 'DockerHealthCheck checkErrorForMemoryFailure')
      if (/cannot allocate memory/.test(message)) {
        ErrorCat.report(new CriticalError(
          message,
          { err: err }
        ))
        return rabbitmq.publishOnDockUnhealthy({
          githubId: job.githubId,
          host: job.dockerHost
        })
      }
    })
}
