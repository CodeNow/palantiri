/**
 * RabbitMQ job management
 * @module lib/models/rabbitmq/hermes
 */
'use strict'
require('loadenv')()

var async = require('async')
var error = require('error-cat')
var hermesClient = require('runnable-hermes')
var put = require('101/put')
var uuid = require('uuid')

var log = require('./logger.js')(__filename)

module.exports = new RabbitMQ()

/**
 * @class
 */
function RabbitMQ () {
  log.info('RabbitMQ constructor')
  this.hermesClient = null
}

/**
 * Queue names for rabbit.
 * @type Array
 */
var queues = [
  'docker-health-check',
  'health-check',
  'on-dock-unhealthy'
]

/**
 * Initiate connection to RabbitMQ server
 * Can be run synchronously, publish/subscribe invocations will be queued
 * Optional callback behavior
 * @param {Function} cb - optional callback
 */
RabbitMQ.prototype.connect = function (cb) {
  var opts = {
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    queues: queues
  }

  log.info(opts, 'RabbitMQ .connect')
  this.hermesClient = hermesClient
    .hermesSingletonFactory(opts)
    .connect(cb)
}

/**
 * load all workers and subscribe to queues
 * Does not need to wait for hermesClient.on('ready'), hermes queues subscriptions
 */
RabbitMQ.prototype.loadWorkers = function () {
  log.info('RabbitMQ .loadWorkers')
  this.hermesClient.subscribe('health-check',
    require('../workers/health-check.js').worker)
  this.hermesClient.subscribe('docker-health-check',
    require('../workers/docker-health-check.js').worker)
}

/**
 * unsubscribe from queues
 * @param {Function} cb (err)
 */
RabbitMQ.prototype.unloadWorkers = function (cb) {
  var self = this
  log.info('RabbitMQ unloadWorkers')
  async.parallel([
    function (cb) {
      log.trace('RabbitMQ unloadWorkers docker-health-check')
      self.hermesClient.unsubscribe('docker-health-check', null, cb)
    },
    function (cb) {
      log.trace('RabbitMQ unloadWorkers health-check')
      self.hermesClient.unsubscribe('health-check', null, cb)
    }],
  function (err) {
    log.trace('RabbitMQ unloadWorkers complete')
    cb(err)
  })
}

/**
 * Disconnect
 * @param {Function} cb (null)
 * @return null
 */
RabbitMQ.prototype.close = function (cb) {
  var self = this
  log.info('RabbitMQ close')
  if (!self.hermesClient) {
    return cb(null)
  }

  self.hermesClient.close(function () {
    self.hermesClient = null
    log.trace('RabbitMQ close complete')
    cb(null)
  })
}

/**
 * publish health-check event
 */
RabbitMQ.prototype.publishHealthCheck = function () {
  var data = {
    timestamp: new Date(),
    healthCheckId: uuid()
  }

  log.info(data, 'RabbitMQ publishHealthCheck')
  this.hermesClient.publish('health-check', data)
}

/**
 * publish docker-health-check event
 * @param  {object} data    data to publish to channel
 */
RabbitMQ.prototype.publishDockerHealthCheck = function (data) {
  data = put({
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  }, data)

  log.info(data, 'RabbitMQ publishDockerHealthCheck')
  RabbitMQ._dataCheck(data, ['dockerHost', 'githubId'])
  this.hermesClient.publish('docker-health-check', data)
}

/**
 * publish on-dock-unhealthy event
 * @param  {object} data    data to publish to channel
 */
RabbitMQ.prototype.publishOnDockUnhealthy = function (data) {
  data = put({
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  }, data)

  RabbitMQ._dataCheck(data, ['host', 'githubId'])
  log.info(data, 'RabbitMQ publishOnDockUnhealthy')
  this.hermesClient.publish('on-dock-unhealthy', data)
}

/**
 * ensures data has required keys, throws if not
 * @param  {object} data object to check
 * @param  {array}  args array of keys to check
 * @return {error}  throws if a key is missing
 */
RabbitMQ._dataCheck = function (data, keys) {
  keys.forEach(function (key) {
    if (!data[key]) {
      throw error.create(400, 'data requires ' + key)
    }
  })
}
