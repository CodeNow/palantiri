'use strict'
require('loadenv')()
const code = require('code')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const Docker = require('../../../lib/external/docker.js')
const Helpers = require('../../../lib/workers/shared/helpers.js')
const Worker = require('../../../lib/workers/image.remove.js').task

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = code.expect
const it = lab.it

describe('image.remove unit test', () => {
  const testJob = {
    host: '10.0.0.2:4242',
    imageTag: 'chill/fire:ice'
  }
  const pushError = new Error('remove me')

  beforeEach((done) => {
    sinon.stub(Helpers, 'ensureDockExists').resolves()
    sinon.stub(Helpers, 'handleDockerError').rejects(pushError)
    sinon.stub(Docker.prototype, 'removeImage')
    done()
  })

  afterEach((done) => {
    Helpers.ensureDockExists.restore()
    Helpers.handleDockerError.restore()
    Docker.prototype.removeImage.restore()
    done()
  })

  it('should call in right order and right params', (done) => {
    Docker.prototype.removeImage.resolves()
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.callOrder(
        Helpers.ensureDockExists,
        Docker.prototype.removeImage
      )
      sinon.assert.calledWith(Helpers.ensureDockExists, testJob.host)
      sinon.assert.calledWith(Docker.prototype.removeImage, testJob.imageTag)
      done()
    })
  })

  it('should handle docker error', (done) => {
    const testError = new Error('red card')
    Docker.prototype.removeImage.rejects(testError)
    Worker(testJob).asCallback((err) => {
      expect(err).to.equal(pushError)
      sinon.assert.callOrder(
        Helpers.ensureDockExists,
        Docker.prototype.removeImage,
        Helpers.handleDockerError
      )
      sinon.assert.calledWith(Helpers.handleDockerError, pushError)
      done()
    })
  })
})
