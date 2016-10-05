'use strict'
require('loadenv')()
const code = require('code')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const Docker = require('../../../lib/external/docker.js')
const Helpers = require('../../../lib/workers/shared/helpers.js')
const rabbitmq = require('../../../lib/external/rabbitmq.js')
const Worker = require('../../../lib/workers/image.push.js').task

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = code.expect
const it = lab.it

describe('image.push unit test', () => {
  const testJob = {
    host: '10.0.0.2:4242',
    imageTag: 'chill/fire:ice'
  }
  const pushError = new Error('push on me')

  beforeEach((done) => {
    sinon.stub(Helpers, 'ensureDockExists').resolves()
    sinon.stub(Helpers, 'handleDockerError').rejects(pushError)
    sinon.stub(Docker.prototype, 'pushImage')
    sinon.stub(rabbitmq, 'publishTask')
    done()
  })

  afterEach((done) => {
    Helpers.ensureDockExists.restore()
    Helpers.handleDockerError.restore()
    Docker.prototype.pushImage.restore()
    rabbitmq.publishTask.restore()
    done()
  })

  it('should call in right order and right params', (done) => {
    Docker.prototype.pushImage.resolves()
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.callOrder(
        Helpers.ensureDockExists,
        Docker.prototype.pushImage,
        rabbitmq.publishTask
      )
      sinon.assert.calledWith(Helpers.ensureDockExists, testJob.host)
      sinon.assert.calledWith(Docker.prototype.pushImage, testJob.imageTag)
      sinon.assert.calledWith(rabbitmq.publishTask, 'image.remove', testJob)
      done()
    })
  })

  it('should handle docker error', (done) => {
    const testError = new Error('red card')
    Docker.prototype.pushImage.rejects(testError)
    Worker(testJob).asCallback((err) => {
      expect(err).to.equal(pushError)
      sinon.assert.callOrder(
        Helpers.ensureDockExists,
        Docker.prototype.pushImage,
        Helpers.handleDockerError
      )
      sinon.assert.calledWith(Helpers.handleDockerError, pushError)
      done()
    })
  })
})
