/**
  * Handles `on-dock-unhealthy` event
  * @module lib/workers/on-dock-unhealthy
  */
'use strict'

const joi = require('joi')
const Promise = require('bluebird')

const rabbitmq = require('../external/rabbitmq.js')

module.exports.jobSchema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  tid: joi.string()
}).unknown().label('job')

module.exports.task = (job) => {
  return Promise
    .try(() => {
      rabbitmq.publishDockExistsCheck({
        host: job.host
      })
    })
}
