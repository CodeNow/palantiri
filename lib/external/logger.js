'use strict'
require('loadenv')()

const bunyan = require('bunyan')
const defaults = require('101/defaults')
const getNamespace = require('continuation-local-storage').getNamespace
const stack = require('callsite')
const put = require('101/put')

/**
 * Serializers for palantiri logging.
 * @type {Object}
 */
const serializers = {
  tx: () => {
    let tid
    try {
      tid = getNamespace('ponos').get('tid')
    } catch (e) {
      // cant do anything here
    }
    return tid ? { tid: tid } : undefined
  }
}
defaults(serializers, bunyan.stdSerializers)

const logger = bunyan.createLogger({
  name: process.env.APP_NAME,
  streams: [{
    level: process.env.LOG_LEVEL_STDOUT,
    stream: process.stdout
  }],
  serializers: serializers,
  // default values included in all log objects
  commit: process.env.npm_package_gitHead,
  environment: process.env.NODE_ENV
})

module.exports = (opts) => {
  opts = opts || {}
  return logger.child(put({
    tx: true,
    module: stack()[1].getFileName()
  }, opts), true)
}
