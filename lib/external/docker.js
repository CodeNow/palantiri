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
   * Lists volumes that aren't associated with any running container
   * @resolves {DockerVolumes[]}
   */
  listDanglingVolumes () {
    const log = this.logger.child({
      method: 'listDanglingVolumes'
    })
    log.info('called')
    return this.listVolumesAsync({
      dangling: true
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
      method: 'Docker removeImage'
    })
    log.info('removeImage called')
    return Promise.fromCallback((cb) => {
      this.client.getImage(imageTag).remove(cb)
    })
  }
}
