/**
 * RabbitMQ job management
 * @module lib/external/rabbitmq
 */
'use strict'
require('loadenv')()

const RabbitMQ = require('ponos/lib/rabbitmq')
const log = require('./logger')()
const schemas = require('./schemas')

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
        name: 'dock.exists-check',
        jobSchema: schemas.dockEventSchema
      }, {
        name: 'asg.check-created',
        jobSchema: schemas.asgCheckCreated
      }, {
        name: 'dock.image.push',
        jobSchema: schemas.imageActionSchema
      }, {
        name: 'dock.image.remove',
        jobSchema: schemas.imageActionSchema
      }, {
        name: 'dock.images.remove',
        jobSchema: schemas.dockEventSchema
      }, {
        name: 'dock.volume.remove',
        jobSchema: schemas.volumeActionSchema
      }, {
        name: 'dock.volumes.remove',
        jobSchema: schemas.dockEventSchema
      }],
      events: [{
        name: 'dock.removed',
        jobSchema: schemas.dockEventSchema
      }, {
        name: 'dock.lost',
        jobSchema: schemas.dockEventSchema
      }]
    })
  }
}

module.exports = new Publisher()
