/**
 * Docker API requests
 * @module lib/external/docker
 */
'use strict'
require('loadenv')()

const async = require('async')
const DockerClient = require('@runnable/loki').Docker
const logger = require('./logger')()

module.exports = class Docker extends DockerClient {
  /**
   * creates docker class
   * @param  {String} host docker host format: https://hostname:hostport
   * @return {Docker}      Docker instance
   */
  constructor (host) {
    const dockerHost = host
    super({ host: dockerHost, log: logger })
  }
  /**
   * pull docker image
   * @param  {string}   image docker image to pull
   * @param  {Function} cb (err)
   */
  pullImage (image, cb) {
    var self = this
    const log = logger.child({
      dockerHost: this.dockerClient,
      method: 'Docker pullImage'
    })
    log.info('call')
    async.retry({
      times: process.env.DOCKER_RETRY_ATTEMPTS,
      interval: process.env.DOCKER_RETRY_INTERVAL
    }, function (callback) {
      self.client.pull(image, function (err, stream) {
        if (err) { return callback(err) }
        // followProgress will return with an argument if error
        self.client.modem.followProgress(stream, callback)
      })
    }, cb)
  }

  /**
   * create docker container
   * @param  {object}   opts options to pass to create container
   * @param  {Function} cb (err, container)
   */
  createContainer (opts, cb) {
    const log = logger.child({
      dockerHost: this.dockerClient,
      method: 'Docker createContainer'
    })
    log.info('call')
    async.retry({
      times: process.env.DOCKER_RETRY_ATTEMPTS,
      interval: process.env.DOCKER_RETRY_INTERVAL
    }, this.client.createContainer.bind(this.client, opts), cb)
  }

  /**
   * start docker container
   * @param  {object} container dockerode container object
   * @param  {Function} cb (err)
   */
  startContainer (container, cb) {
    const log = logger.child({
      dockerHost: this.dockerClient,
      method: 'Docker startContainer'
    })
    log.info('call')
    async.retry({
      times: process.env.DOCKER_RETRY_ATTEMPTS,
      interval: process.env.DOCKER_RETRY_INTERVAL
    }, container.start.bind(container), cb)
  }

  /**
   * remove docker container
   * @param  {object} container dockerode container object
   * @param  {Function} cb (err)
   */
  removeContainer (container, cb) {
    const log = logger.child({
      dockerHost: this.dockerClient,
      method: 'Docker removeContainer'
    })
    log.info('call')
    async.retry({
      times: process.env.DOCKER_RETRY_ATTEMPTS,
      interval: process.env.DOCKER_RETRY_INTERVAL
    }, container.remove.bind(container), cb)
  }

  /**
   * get logs from container
   * @param  {object} container dockerode container object
   * @param  {Function} cb (err, logs)
   */
  containerLogs (container, cb) {
    const log = logger.child({
      dockerHost: this.dockerClient,
      method: 'Docker containerLogs'
    })
    log.info('call')
    async.retry({
      times: process.env.DOCKER_RETRY_ATTEMPTS,
      interval: process.env.DOCKER_RETRY_INTERVAL
    }, function (callback) {
      container.logs({
        follow: true,
        stdout: true,
        stderr: true
      }, function (err, stream) {
        if (err) { return callback(err) }
        var logBuffer = ''
        var logErrorBuffer = ''

        container.modem.demuxStream(stream, {
          write: function (data) {
            data = data.toString()
            log.trace({ log: data }, 'stdout data')
            logBuffer += data
          }
        }, {
          write: function (data) {
            data = data.toString()
            log.trace({ log: data }, 'stderr data')
            logErrorBuffer += data
          }
        })

        stream.on('end', function () {
          log.trace({
            log: logBuffer,
            err: logErrorBuffer
          }, 'Docker containerLogs returned')
          if (logErrorBuffer) { return callback(logErrorBuffer) }

          callback(null, logBuffer)
        })
      })
    }, cb)
  }

}
