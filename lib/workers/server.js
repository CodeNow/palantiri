'use strict'

const Promise = require('bluebird')
const ErrorCat = require('error-cat')
const ponos = require('ponos')

const log = require('../external/logger')()
const healthCheck = require('./health-check.js').worker
const dockerHealthCheck = require('./docker-health-check.js').worker

const queues = {
  'user.whitelisted': require('./user-whitelisted'),
  'asg.check-created': require('./asg-check-created'),
  'health-check': function () {
    let args = [].slice.apply(arguments)
    return Promise.fromCallback(cb => {
      args.push(cb)
      healthCheck.apply(healthCheck, args)
    })
  },
  'docker-health-check': function () {
    let args = [].slice.apply(arguments)
    return Promise.fromCallback(cb => {
      args.push(cb)
      dockerHealthCheck.apply(healthCheck, args)
    })
  }
}

/**
 * The big-poppa ponos server.
 * @type {ponos~Server}
 * @module big-poppa/worker
 */
const server = module.exports = new ponos.Server({
  name: 'palantiri',
  rabbitmq: {
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
