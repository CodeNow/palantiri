/**
 * RabbitMQ job management
 * @module lib/models/rabbitmq/hermes
 */
'use strict'
require('loadenv')()

var error = require('error-cat')
var put = require('101/put')
var uuid = require('uuid')

var log = require('./logger.js')()

const RabbitMQ = require('ponos/lib/rabbitmq')

/**
 * Rabbitmq internal singelton instance.
 * @type {rabbitmq}
 */
const publisher = new RabbitMQ({
  name: process.env.APP_NAME,
  hostname: process.env.RABBITMQ_HOSTNAME,
  port: process.env.RABBITMQ_PORT,
  username: process.env.RABBITMQ_USERNAME,
  password: process.env.RABBITMQ_PASSWORD
})

module.exports = publisher

/**
 * publish health-check event
 */
publisher.publishHealthCheck = function () {
  var data = {
    timestamp: new Date(),
    healthCheckId: uuid()
  }

  log.info(data, 'RabbitMQ publishHealthCheck')
  publisher.publishTask('health-check', data)
}

/**
 * publish docker-health-check event
 * @param  {object} data    data to publish to channel
 */
publisher.publishDockerHealthCheck = function (data) {
  data = put({
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  }, data)

  log.info(data, 'RabbitMQ publishDockerHealthCheck')
  publisher._dataCheck(data, ['dockerHost', 'githubId'])
  publisher.publishTask('docker-health-check', data)
}

/**
 * publish on-dock-unhealthy event
 * @param  {object} data    data to publish to channel
 */
publisher.publishOnDockUnhealthy = function (data) {
  data = put({
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  }, data)

  publisher._dataCheck(data, ['host', 'githubId'])
  log.info(data, 'RabbitMQ publishOnDockUnhealthy')
  publisher.publishTask('on-dock-unhealthy', data)
}

/**
 * publish `asg.check-created` event
 * @param  {object} data           - data to publish to channel
 * @param  {String} data.orgName   - Name of the org
 * @param  {Number} data.githubId  - Github ID for org
 * @param  {Number} data.createdAt - Unix timestamp (in seconds)
 */
publisher.publishASGCheckCreated = function (data) {
  data = put({
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  }, data)

  publisher._dataCheck(data, ['orgName', 'githubId', 'createdAt'])
  log.info(data, 'RabbitMQ publishASGCheckCreated')
  publisher.publishTask('asg.check-created', data)
}

/**
 * ensures data has required keys, throws if not
 * @param  {object} data object to check
 * @param  {array}  args array of keys to check
 * @return {error}  throws if a key is missing
 */
publisher._dataCheck = function (data, keys) {
  keys.forEach(function (key) {
    if (!data[key]) {
      throw error.create(400, 'data requires ' + key)
    }
  })
}
