/**
 * RabbitMQ job management
 * @module lib/models/rabbitmq/hermes
 */
'use strict'
require('loadenv')()

const BaseError = require('error-cat/errors/base-error')
const RabbitMQ = require('ponos/lib/rabbitmq')

const log = require('./logger.js')()

/**
 * Rabbitmq internal singelton instance.
 * @type {rabbitmq}
 */
class Publisher extends RabbitMQ {
  constructor () {
    super({
      name: process.env.APP_NAME,
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD
    })
  }

  /**
   * publish health-check event
   */
  publishHealthCheck () {
    log.info('RabbitMQ publishHealthCheck')
    this.publishTask('health-check', {})
  }

  /**
   * publish docker-health-check event
   * @param  {object} data    data to publish to channel
   */
  publishDockerHealthCheck (data) {
    log.info(data, 'RabbitMQ publishDockerHealthCheck')
    this._dataCheck(data, ['dockerHost'])
    this.publishTask('docker-health-check', data)
  }

  /**
   * publish on-dock-unhealthy event
   * @param  {object} data    data to publish to channel
   */
  publishOnDockUnhealthy (data) {
    this._dataCheck(data, ['host'])
    log.info(data, 'RabbitMQ publishOnDockUnhealthy')
    this.publishTask('on-dock-unhealthy', data)
  }

  /**
   * publish dock.exists-check task
   * @param  {object} data    data to publish to channel
   */
  publishDockExistsCheck (data) {
    this._dataCheck(data, ['host'])
    log.info(data, 'RabbitMQ publishDockExistsCheck')
    this.publishTask('dock.exists-check', data)
  }

  /**
   * publish dock removed event
   * @param  {object} data    data to publish to channel
   */
  publishDockRemoved (data) {
    log.info(data, 'RabbitMQ publishDockRemoved')
    this._dataCheck(data, ['host'])
    this.publishEvent('dock.removed', data)
  }

  /**
   * publish `asg.check-created` event
   * @param  {object} data           - data to publish to channel
   * @param  {String} data.orgName   - Name of the org
   * @param  {Number} data.githubId  - Github ID for org
   * @param  {Number} data.createdAt - Unix timestamp (in seconds)
   */
  publishASGCheckCreated (data) {
    this._dataCheck(data, ['orgName', 'githubId', 'createdAt'])
    log.info(data, 'RabbitMQ publishASGCheckCreated')
    this.publishTask('asg.check-created', data)
  }

  /**
   * publish push image task
   * @param  {object} data    data to publish to channel
   */
  publishPushImage (data) {
    log.info(data, 'RabbitMQ publishPushImage')
    this._dataCheck(data, ['imageTag'])
    this.publishTask('image.push', data)
  }

  /**
   * ensures data has required keys, throws if not
   * @param  {object} data object to check
   * @param  {array}  args array of keys to check
   * @return {error}  throws if a key is missing
   */
  _dataCheck (data, keys) {
    keys.forEach(function (key) {
      if (!data[key]) {
        throw new BaseError('missing key', {
          missing: key,
          data: data
        })
      }
    })
  }
}

module.exports = new Publisher()
