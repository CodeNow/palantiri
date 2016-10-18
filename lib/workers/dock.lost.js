/**
  * Handles `dock.lost` event
  * @module lib/workers/dock.lost
  */
'use strict'

const Promise = require('bluebird')

const rabbitmq = require('../external/rabbitmq')
const schemas = require('../external/schemas')

module.exports.jobSchema = schemas.dockEventSchema

module.exports.task = (job) => {
  return Promise
    .try(() => {
      rabbitmq.publishTask('dock.exists-check', job)
    })
}
