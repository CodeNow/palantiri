'use strict'

const ErrorCat = require('error-cat')
const ponos = require('ponos')

const log = require('../external/logger')()

const queues = {
  'user.whitelisted': require('./user-whitelisted'),
  'asg.check-created': require('./asg.check-created'),
  'health-check': require('./health-check'),
  'docker-health-check': require('./docker-health-check')
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
  queues: Object.keys(queues)
})

server.setAllTasks(queues)

module.exports = server
