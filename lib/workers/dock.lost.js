/**
  * Handles `dock.lost` event
  * @module lib/workers/dock.lost
  */
'use strict'

const joi = require('joi')
const Promise = require('bluebird')

const rabbitmq = require('../external/rabbitmq.js')

module.exports.jobSchema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  // TODO: should be reqquired in the future
  githubOrgId: joi.number()
}).unknown()

module.exports.task = (job) => {
  return Promise
    .try(() => {
      rabbitmq.publishTask('dock.exists-check', job)
    })
}
