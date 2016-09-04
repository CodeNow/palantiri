'use strict'

const ErrorCat = require('error-cat')
const ponos = require('ponos')

const log = require('../external/logger')()

const subscribedTasks = {
  'asg.check-created': require('./asg.check-created'),
  'dock.exists-check': require('./dock.exists-check'),
  'docker-health-check': require('./docker-health-check'),
  'health-check': require('./health-check'),
  'image.push': require('./image.push'),
  'image.remove': require('./image.remove')
}

const subscribedEvents = {
  'dock.disk.filled': require('./dock.disk.filled'),
  'dock.lost': require('./dock.lost'),
  'dock.memory.exhausted': require('./dock.lost'),
  'dock.unresponsive': require('./dock.lost'),
  'user.whitelisted': require('./user-whitelisted')
}

/**
 * The plantiri ponos server.
 * @type {ponos~Server}
 * @module palantiri/worker
 */
const server = module.exports = new ponos.Server({
  name: process.env.APP_NAME,
  rabbitmq: {
    channel: {
      prefetch: process.env.WORKER_PREFETCH
    },
    hostname: process.env.RABBITMQ_HOSTNAME,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD
  },
  errorCat: ErrorCat,
  log: log,
  tasks: subscribedTasks,
  events: subscribedEvents
})

module.exports = server
