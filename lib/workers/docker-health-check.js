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

const CriticalError = require('error-cat/errors/critical-error')
const ErrorCat = require('error-cat')
const monitorDog = require('monitor-dog')
const joi = require('joi')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const logger = require('../external/logger.js')()
const Docker = require('../external/docker.js')
const rabbitmq = require('../external/rabbitmq.js')

module.exports.jobSchema = joi.object({
  dockerHost: joi.string().uri({ scheme: 'http' }).required(),
  tid: joi.string()
}).label('job')

module.exports.maxNumRetries = 5

module.exports.task = (job) => {
  const log = logger.child({
    method: 'DockerHealthCheck'
  })
  const dockerClient = new Docker(job.dockerHost)
  return dockerClient.pullImage(process.env.INFO_IMAGE)
    .then(() => {
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
    .tap((container) => {
      const dockerClient = new Docker(job.dockerHost)
      return dockerClient.startContainer(container)
    })
    .tap((container) => {
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
        .then((containerLogs) => {
          // sends data to datadog and create unhealthy job if memory usage high
          var data = containerLogs.info || {}
          Object.keys(data).forEach(function (key) {
            // first sanitize data
            data[key] = parseInt(data[key], 10)
            monitorDog.gauge(key, data[key], ['dockerHost:' + job.dockerHost])
          })

          if (data.VmRSS >= process.env.RSS_LIMIT) {
            rabbitmq.publishTask('dock.lost', {
              host: job.dockerHost
            })
          }
        })
    })
    .then((container) => {
      const dockerClient = new Docker(job.dockerHost)
      return dockerClient.removeContainer(container)
    })
    .catch(CriticalError, (err) => {
      log.error({
        err: err
      }, 'DockerHealthCheck checkErrorForMemoryFailure')
      if (/cannot allocate memory/.test(err.message)) {
        ErrorCat.report(err)
        return rabbitmq.publishTask('dock.lost', {
          host: job.dockerHost
        })
      }
    })
}
