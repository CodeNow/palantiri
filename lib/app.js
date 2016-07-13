/**
 * starts / stops palantiri
 * @module app
 */

'use strict'
require('loadenv')()

var domain = require('domain')

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
  var workerDomain = domain.create()

  workerDomain.on('error', function (err) {
    log.fatal({
      err: err
    }, 'palantiri domain error')

    cb(err)
  })

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
        // rabbitmq.loadWorkers()

        self.interval = setInterval(function () {
          rabbitmq.publishHealthCheck()
        }, process.env.COLLECT_INTERVAL)

        rabbitmq.publishHealthCheck()

        return cb(null)
      })
    }),
    ponoServer.start()
  ])
    .asCallback(cb)
}

/**
 * unloads workers, closes rabbit connection, and stops interval
 * @param  {Function} cb (err)
 */
App.prototype.stop = function (cb) {
  var self = this
  var workerDomain = domain.create()

  workerDomain.on('error', function (err) {
    log.fatal({
      err: err
    }, 'palantiri stopping domain error')

    cb(err)
  })

  Promise.all([
    Promise.fromCallback(function (cb) {
      log.info('palantiri stop')
      clearInterval(self.interval)

      rabbitmq.unloadWorkers(function (err) {
        if (err) {
          log.fatal({
            err: err
          }, 'palantiri error unloadWorkers workers')
        }

        rabbitmq.close(function (err) {
          if (err) {
            log.fatal({
              err: err
            }, 'palantiri error closing rabbitmq')
          }

          cb(null)
        })
      })
    }),
    ponoServer.stop()
  ])
    .asCallback(cb)
}
