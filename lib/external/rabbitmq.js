/**
 * RabbitMQ job management
 * @module lib/external/rabbitmq
 */
'use strict'
require('loadenv')()

const joi = require('joi')
const RabbitMQ = require('ponos/lib/rabbitmq')

const log = require('./logger.js')()

const dockEventSchema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  // TODO: should be reqquired in the future
  githubOrgId: joi.number()
}).required()

const imageEventSchema = joi.object({
  imageTag: joi.string().required(),
  host: joi.string().required()
}).required()

/**
 * Rabbitmq internal singelton instance.
 * @type {rabbitmq}
 */
class Publisher extends RabbitMQ {
  constructor () {
    super({
      name: process.env.APP_NAME,
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
      log: log.child({ module: 'publisher' }),
      tasks: [{
        name: 'health-check',
        jobSchema: joi.object().required()
      }, {
        name: 'docker-health-check',
        jobSchema: joi.object({
          dockerHost: joi.string().uri({ scheme: 'http' }).required(),
          // TODO: should be reqquired in the future
          githubOrgId: joi.number()
        }).required()
      }, {
        name: 'dock.exists-check',
        jobSchema: dockEventSchema
      }, {
        name: 'asg.check-created',
        jobSchema: joi.object({
          orgName: joi.string().required(),
          githubId: joi.number().required(),
          createdAt: joi.date().timestamp('unix').required()
        }).required()
      }, {
        name: 'image.push',
        jobSchema: imageEventSchema
      }, {
        name: 'image.remove',
        jobSchema: imageEventSchema
      }],
      events: [{
        name: 'dock.removed',
        jobSchema: dockEventSchema
      }, {
        name: 'dock.lost',
        jobSchema: dockEventSchema
      }]
    })
  }
}

module.exports = new Publisher()
