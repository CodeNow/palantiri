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
  /**
   * connects to rabbitmq and loads workers
   * @return {Promise}
   */
  start () {
    log.info('palantiri start')
    return rabbitmq.connect()
      .then(() => {
        log.info('rabbimq publisher started')
        return workerServer.start()
      })
      .catch((err) => {
        log.fatal({ err: err }, 'palantiri start fatal error')
        throw err
      })
  }

  /**
   * unloads workers, closes rabbit connection
   * @return {Promise}
   */
  stop () {
    log.info('palantiri stop')
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
