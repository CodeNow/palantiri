/**
 * starts / stops palantiri
 * @module app
 */

'use strict'
require('loadenv')()

const Promise = require('bluebird')
const ponoServer = require('./workers/server')
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

  Promise.all([
    Promise.fromCallback(function (cb) {
      log.info('palantiri start')
      rabbitmq.connect(function (err) {
        if (err) {
          log.fatal({
            err: err
          }, 'palantiri error connecting to rabbit')
          return cb(err)
        }
        log.trace('palantiri connected')

        self.interval = setInterval(function () {
          rabbitmq.publishHealthCheck()
        }, process.env.COLLECT_INTERVAL)

        rabbitmq.publishHealthCheck()

        return cb(null)
      })
    }),
    ponoServer.start()
  ])
    .catch(err => {
      log.fatal({ err: err }, 'palantiri fatal error')
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

  Promise.all([
    Promise.fromCallback(function (cb) {
      log.info('palantiri stop')
      clearInterval(self.interval)

      rabbitmq.close(function (err) {
        if (err) {
          log.fatal({
            err: err
          }, 'palantiri error closing rabbitmq')
        }

        cb(null)
      })
    }),
    ponoServer.stop()
  ])
    .catch(err => {
      log.fatal({ err: err }, 'palantiri stopping fatal error')
      throw err
    })
    .asCallback(cb)
}
