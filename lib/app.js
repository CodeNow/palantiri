/**
 * starts / stops palantiri
 * @module app
 */

'use strict'
require('loadenv')()

const Promise = require('bluebird')
const workerServer = require('./workers/server')
var log = require('./external/logger.js')()
var rabbitmq = require('./external/rabbitmq.js')

module.exports = App

function App () {
  this.interval = null
}
/**
 * connects to rabbitmq and loads workers and start interval
 * @param  {Function} cb (err)
 */
App.prototype.start = function (cb) {
  var self = this
  log.info('palantiri start')
  rabbitmq.connect()
    .then(() => {
      log.info('rabbimq publisher started')
      return workerServer.start()
        .then(() => {
          log.info('all components started')
          self.interval = setInterval(function () {
            rabbitmq.publishHealthCheck()
          }, process.env.COLLECT_INTERVAL)

          rabbitmq.publishHealthCheck()
        })
    })
    .catch((err) => {
      log.fatal({ err: err }, 'palantiri start fatal error')
      throw err
    })
    .asCallback(cb)
}

/**
 * unloads workers, closes rabbit connection, and stops interval
 * @param  {Function} cb (err)
 */
App.prototype.stop = function (cb) {
  var self = this
  log.info('palantiri stop')
  clearInterval(self.interval)
  Promise.all([
    rabbitmq.disconnect(),
    workerServer.stop()
  ])
    .catch((err) => {
      log.fatal({ err: err }, 'palantiri stopping fatal error')
      throw err
    })
    .asCallback(cb)
}
