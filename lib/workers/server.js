'use strict'

const ErrorCat = require('error-cat')
const ponos = require('ponos')

const log = require('../external/logger')()

const subscribedTasks = {
  'asg.check-created': require('./asg.check-created'),
  'dock.exists-check': require('./dock.exists-check'),
  'dock.image.push': require('./dock.image.push'),
  'dock.image.remove': require('./dock.image.remove'),
  'dock.images.remove': require('./dock.images.remove'),
  'dock.volume.remove': require('./dock.volume.remove'),
  'dock.volumes.remove': require('./dock.volumes.remove')
}

const subscribedEvents = {
  'dock.disk.filled': require('./dock.disk.filled'),
  'dock.lost': require('./dock.lost'),
  'dock.memory.exhausted': require('./dock.lost'),
  'dock.unresponsive': require('./dock.lost'),
  'organization.created': require('./organization.created')
}

/**
 * The plantiri ponos server.
 * @type {ponos~Server}
 * @module palantiri/worker
 */
module.exports = new ponos.Server({
  name: process.env.APP_NAME,
  enableErrorEvents: true,
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
