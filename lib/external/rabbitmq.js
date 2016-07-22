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
class Publisher {
  constructor () {
    this.publisher = new RabbitMQ({
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
    this.publisher.publishTask('health-check')
  }

  /**
   * publish docker-health-check event
   * @param  {object} data    data to publish to channel
   */
  publishDockerHealthCheck (data) {
    log.info(data, 'RabbitMQ publishDockerHealthCheck')
    Publisher._dataCheck(data, ['dockerHost', 'githubId'])
    this.publisher.publishTask('docker-health-check', data)
  }

  /**
   * publish on-dock-unhealthy event
   * @param  {object} data    data to publish to channel
   */
  publishOnDockUnhealthy (data) {
    Publisher._dataCheck(data, ['host', 'githubId'])
    log.info(data, 'RabbitMQ publishOnDockUnhealthy')
    this.publisher.publishTask('on-dock-unhealthy', data)
  }

  /**
   * publish dock.exists-check task
   * @param  {object} data    data to publish to channel
   */
  publishDockExistsCheck (data) {
    Publisher._dataCheck(data, ['dockerUrl', 'githubId'])
    log.info(data, 'RabbitMQ publishDockExistsCheck')
    this.publisher.publishTask('dock.exists-check', data)
  }

  /**
   * publish dock removed event
   * @param  {object} data    data to publish to channel
   */
  publishDockRemoved (data) {
    log.info(data, 'RabbitMQ publishDockRemoved')
    Publisher._dataCheck(data, ['host', 'githubId'])
    this.publisher.publishTask('dock.removed', data)
  }

  /**
   * publish `asg.check-created` event
   * @param  {object} data           - data to publish to channel
   * @param  {String} data.orgName   - Name of the org
   * @param  {Number} data.githubId  - Github ID for org
   * @param  {Number} data.createdAt - Unix timestamp (in seconds)
   */
  publishASGCheckCreated (data) {
    Publisher._dataCheck(data, ['orgName', 'githubId', 'createdAt'])
    log.info(data, 'RabbitMQ publishASGCheckCreated')
    this.publisher.publishTask('asg.check-created', data)
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
