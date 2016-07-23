'use strict'

require('loadenv')()

const Promise = require('bluebird')
var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var Code = require('code')
var expect = Code.expect

var sinon = require('sinon')
require('sinon-as-promised')(Promise)

const Docker = require('../../../lib/external/docker.js')
var DockerHealthCheck = require('../../../lib/workers/docker-health-check.js')
var rabbitmq = require('../../../lib/external/rabbitmq.js')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

describe('docker-health-check.js unit test', function () {
  var container = {
    id: 'docker-container-id-1'
  }
  beforeEach(function (done) {
    process.env.RSS_LIMIT = 1
    sinon.stub(Docker.prototype, 'pullImage').resolves()
    sinon.stub(Docker.prototype, 'createContainer').resolves(container)
    sinon.stub(Docker.prototype, 'startContainer').resolves()
    sinon.stub(Docker.prototype, 'containerLogs').resolves('{"id": "some-id"}')
    sinon.stub(Docker.prototype, 'removeContainer').resolves()
    sinon.stub(rabbitmq, 'publishOnDockUnhealthy')
    done()
  })

  afterEach(function (done) {
    delete process.env.RSS_LIMIT
    Docker.prototype.pullImage.restore()
    Docker.prototype.createContainer.restore()
    Docker.prototype.startContainer.restore()
    Docker.prototype.containerLogs.restore()
    Docker.prototype.removeContainer.restore()
    rabbitmq.publishOnDockUnhealthy.restore()
    done()
  })

  it('should fail if dockerHost is null', function (done) {
    DockerHealthCheck({})
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.include('"dockerHost" is required')
      expect(err).instanceOf(WorkerStopError)
      done()
    })
  })

  it('should fail if dockerHost is not a string', function (done) {
    DockerHealthCheck({ dockerHost: 1 })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.include('"dockerHost" must be a string')
      expect(err).instanceOf(WorkerStopError)
      done()
    })
  })

  it('should fail if githubId is null', function (done) {
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1' })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.include('"githubId" is required')
      expect(err).instanceOf(WorkerStopError)
      done()
    })
  })

  it('should fail if githubId is not a string', function (done) {
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: {} })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.include('"githubId" must be a string')
      expect(err).instanceOf(WorkerStopError)
      done()
    })
  })

  it('should fail if pullImage failed', function (done) {
    Docker.prototype.pullImage.rejects(new Error('Docker error'))
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.equal('Docker error')
      done()
    })
  })

  it('should fail if createContainer failed', function (done) {
    Docker.prototype.createContainer.rejects(new Error('Docker error'))
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.equal('Docker error')
      done()
    })
  })

  it('should fail if startContainer failed', function (done) {
    Docker.prototype.startContainer.rejects(new Error('Docker error'))
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.equal('Docker error')
      done()
    })
  })

  it('should fail if containerLogs failed', function (done) {
    Docker.prototype.containerLogs.rejects(new Error('Docker error'))
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.equal('Docker error')
      done()
    })
  })

  it('should fail if removeContainer failed', function (done) {
    Docker.prototype.removeContainer.rejects(new Error('Docker error'))
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.equal('Docker error')
      done()
    })
  })

  it('should call pullImage with correct args', function (done) {
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function () {
      sinon.assert.calledOnce(Docker.prototype.pullImage)
      sinon.assert.calledWith(Docker.prototype.pullImage, process.env.INFO_IMAGE)
    })
    .asCallback(done)
  })

  it('should call createContainer with correct args', function (done) {
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function (c) {
      sinon.assert.calledOnce(Docker.prototype.createContainer)
      sinon.assert.calledWith(Docker.prototype.createContainer, {
        Image: process.env.INFO_IMAGE,
        Labels: {
          type: 'docker-health-check'
        },
        Env: [
          'LOOKUP_CMD=/docker',
          'LOOKUP_ARGS=-d'
        ],
        HostConfig: {
          Privileged: true,
          PidMode: 'host'
        }
      })
    })
    .asCallback(done)
  })

  it('should call startContainer with correct args', function (done) {
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function () {
      sinon.assert.calledOnce(Docker.prototype.startContainer)
      sinon.assert.calledWith(Docker.prototype.startContainer, container)
    })
    .asCallback(done)
  })

  it('should call containerLogs with correct args', function (done) {
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function () {
      sinon.assert.calledOnce(Docker.prototype.containerLogs)
      sinon.assert.calledWith(Docker.prototype.containerLogs, container)
    })
    .asCallback(done)
  })

  it('should call removeContainer with correct args', function (done) {
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function () {
      sinon.assert.calledOnce(Docker.prototype.removeContainer)
      sinon.assert.calledWith(Docker.prototype.removeContainer, container)
    })
    .asCallback(done)
  })

  it('should fail with WorkerStopError if logs are invalid', function (done) {
    Docker.prototype.containerLogs.resolves('{1-1}')
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .then(function () {
      done(new Error('Should never happen'))
    })
    .catch(function (err) {
      expect(err.message).to.equal('Invalid logs')
      expect(err).instanceOf(WorkerStopError)
      done()
    })
  })

  it('should publish on-healthy event if logs has "cannot allocate memory" msg', function (done) {
    Docker.prototype.containerLogs.resolves('{"error":"cannot allocate memory"}')
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function () {
      sinon.assert.calledOnce(rabbitmq.publishOnDockUnhealthy)
      sinon.assert.calledWith(rabbitmq.publishOnDockUnhealthy, {
        host: 'https://10.20.0.1',
        githubId: '2335750'
      })
    })
    .asCallback(done)
  })

  it('should not publish on-healthy event if logs has no "cannot allocate memory" msg', function (done) {
    Docker.prototype.containerLogs.resolves('{"error":"some error"}')
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function () {
      sinon.assert.notCalled(rabbitmq.publishOnDockUnhealthy)
    })
    .asCallback(done)
  })

  it('should publish on-healthy event if too much memory used', function (done) {
    Docker.prototype.containerLogs.resolves('{"info":{"VmRSS": 2}}')
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function () {
      sinon.assert.calledOnce(rabbitmq.publishOnDockUnhealthy)
      sinon.assert.calledWith(rabbitmq.publishOnDockUnhealthy, {
        host: 'https://10.20.0.1',
        githubId: '2335750'
      })
    })
    .asCallback(done)
  })

  it('should not publish on-healthy event if not much memory used', function (done) {
    Docker.prototype.containerLogs.resolves('{"info":{"VmRSS": 0.8}}')
    DockerHealthCheck({ dockerHost: 'https://10.20.0.1', githubId: '2335750' })
    .tap(function () {
      sinon.assert.notCalled(rabbitmq.publishOnDockUnhealthy)
    })
    .asCallback(done)
  })
})
