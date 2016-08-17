/**
 * starts / stops palantiri
 * @module app
 */

'use strict'
require('loadenv')()

const Promise = require('bluebird')
const workerServer = require('./workers/server')
const log = require('./external/logger.js')()
const rabbitmq = require('./external/rabbitmq.js')

module.exports = class App {
  constructor () {
    this.interval = null
  }

  /**
   * connects to rabbitmq and loads workers and start interval
   * @return {Promise}
   */
  start () {
    log.info('palantiri start')
    return rabbitmq.connect()
      .then(() => {
        log.info('rabbimq publisher started')
        return workerServer.start()
          .then(() => {
            log.info('all components started')
            this.interval = setInterval(function () {
              rabbitmq.publishHealthCheck()
            }, process.env.COLLECT_INTERVAL)

            rabbitmq.publishHealthCheck()
          })
      })
      .catch((err) => {
        log.fatal({ err: err }, 'palantiri start fatal error')
        throw err
      })
  }

  /**
   * unloads workers, closes rabbit connection, and stops interval
   * @return {Promise}
   */
  stop () {
    log.info('palantiri stop')
    clearInterval(this.interval)
    return Promise.all([
      rabbitmq.disconnect(),
      workerServer.stop()
    ])
      .catch((err) => {
        log.fatal({ err: err }, 'palantiri stopping fatal error')
        throw err
      })
  }
}
