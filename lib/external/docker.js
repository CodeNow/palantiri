/**
 * Docker API requests
 * @module lib/external/docker
 */
'use strict'
require('loadenv')()
const async = require('async')
const DockerClient = require('@runnable/loki').Docker
const DockerUtils = require('@runnable/loki').Utils
const Promise = require('bluebird')

const logger = require('./logger')()

Promise.promisifyAll(async)

module.exports = class Docker extends DockerClient {
  /**
   * creates docker class
   * @param  {String} host docker host format: [https://]hostname:hostport
   * @return {Docker}      Docker instance
   */
  constructor (host) {
    const dockerHost = DockerUtils.toDockerUrl(host)
    super({ host: dockerHost, log: logger })

    this.logger = logger.child({
      dockerHost: this.dockerHost
    })
  }

  /**
   * Returns list of all images
   * @return {Promise}
   * @resolves {DockerImages[]} all images on dockerhost
   * DockerImages: {
   *  Id: 'sha256:e50427e890a7c83beacf646a2bb283379989f04e1de0beac9448546a0b51b429',
   *  ParentId: '',
   *  RepoTags: [ 'weaveworks/weave:1.4.6' ],
   *  RepoDigests: null,
   *  Created: 1458754743,
   *  Size: 19295936,
   *  VirtualSize: 19295936,
   *  Labels: { 'works.weave.role': 'system' }
   * }
   */
  listImages () {
    const log = this.logger.child({
      method: 'listImages'
    })
    log.info('listImages called')
    return this.listImagesAsync({
      all: true
    })
  }

  /**
   * pushes docker image to registry. Resolves when push complete
   * @param  {string} imageId id of image to push to registry
   *                  format: registry.runnable.com/123/456:<tag>
   * @return {Promise} Resolves when push complete
   */
  pushImage (imageTag) {
    const log = this.logger.child({
      imageTag: imageTag,
      method: 'Docker.pushImage'
    })
    log.info('pushImage called')
    var tag = imageTag.split(':')[1]
    return Promise.fromCallback((cb) => {
      this.client.getImage(imageTag).push({
        tag: tag
      }, (err, stream) => {
        if (err) { return cb(err) }
        // followProgress will return with an argument if error
        this.client.modem.followProgress(stream, cb)
      })
    })
  }

  /**
   * remove docker image
   * pushes docker image to registry. Resolves when push complete
   * @param  {string} imageTag id of image to push to registry
   *                  format: registry.runnable.com/123/456:<tag>
   * @return {Promise} Resolves when push complete
   */
  removeImage (imageTag) {
    const log = this.logger.child({
      imageTag: imageTag,
      method: 'Docker removeContainer'
    })
    log.info('call removeContainer')
    return Promise.fromCallback((cb) => {
      this.client.getImage(imageTag).remove(cb)
    })
  }

  /**
   * pull docker image
   * @param  {string}   image docker image to pull
   * @return {Promise}
   */
  pullImage (image) {
    var self = this
    const log = this.logger.child({
      method: 'Docker pullImage'
    })
    log.info('call pullImage')
    return Promise.fromCallback(function (cb) {
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
    })
  }

  /**
   * create docker container
   * @param  {object}   opts options to pass to create container
   * @return {Promise} container
   */
  createContainer (opts) {
    const log = this.logger.child({
      method: 'Docker createContainer'
    })
    log.info('call createContainer')
    var self = this
    return Promise.fromCallback(function (cb) {
      async.retry({
        times: process.env.DOCKER_RETRY_ATTEMPTS,
        interval: process.env.DOCKER_RETRY_INTERVAL
      }, function (callback) {
        self.client.createContainer(opts, callback)
      }, cb)
    })
  }

  /**
   * start docker container
   * @param  {object} container dockerode container object
   * @return {Promise}
   */
  startContainer (container) {
    const log = this.logger.child({
      containerId: container.id,
      method: 'Docker startContainer'
    })
    log.info('call startContainer')
    return Promise.fromCallback(function (cb) {
      async.retry({
        times: process.env.DOCKER_RETRY_ATTEMPTS,
        interval: process.env.DOCKER_RETRY_INTERVAL
      }, container.start.bind(container), cb)
    })
  }

  /**
   * remove docker container
   * @param  {object} container dockerode container object
   * @return {Promise}
   */
  removeContainer (container) {
    const log = this.logger.child({
      containerId: container.id,
      method: 'Docker removeContainer'
    })
    log.info('call removeContainer')
    return Promise.fromCallback(function (cb) {
      async.retry({
        times: process.env.DOCKER_RETRY_ATTEMPTS,
        interval: process.env.DOCKER_RETRY_INTERVAL
      }, container.remove.bind(container), cb)
    })
  }

  /**
   * get logs from container
   * @param  {object} container dockerode container object
   * @return {Promise} logs
   */
  containerLogs (container) {
    const log = this.logger.child({
      containerId: container.id,
      method: 'Docker containerLogs'
    })
    log.info('containerLogs call')
    return Promise.fromCallback(function (cb) {
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
              logBuffer += data
            }
          }, {
            write: function (data) {
              data = data.toString()
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
    })
  }
}
