'use strict'

const joi = require('joi')
const Promise = require('bluebird')

const rabbitmq = require('../external/rabbitmq.js')

module.exports.jobSchema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  org: joi.number().required()
}).unknown().required()

module.exports.task = (job) => {
  return Promise.try(() => {
    rabbitmq.publishEvent('dock.lost', {
      host: job.host,
      githubOrgId: parseInt(job.org, 10)
    })
  })
}
