'use strict'
require('loadenv')()

const Code = require('code')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')
const WorkerError = require('error-cat/errors/worker-error')

const Swarm = require('../../../lib/external/swarm.js')
const DockExistsCheck = require('../../../lib/workers/dock.exists-check.js').task
const rabbitmq = require('../../../lib/external/rabbitmq.js')
const BaseDockerClient = require('@runnable/loki')._BaseClient

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = Code.expect
const it = lab.it

describe('dock.exists-check.js unit test', () => {
  const testJob = {
    host: 'http://10.0.0.2:4242'
  }
  beforeEach((done) => {
    process.env.RSS_LIMIT = 1
    sinon.stub(BaseDockerClient.prototype, 'killContainerAsync')
    sinon.stub(Swarm.prototype, 'swarmHostExistsAsync')
    sinon.stub(rabbitmq, 'publishDockRemoved')
    done()
  })

  afterEach((done) => {
    delete process.env.RSS_LIMIT
    BaseDockerClient.prototype.killContainerAsync.restore()
    Swarm.prototype.swarmHostExistsAsync.restore()
    rabbitmq.publishDockRemoved.restore()
    done()
  })

  it('should call killContainerAsync', (done) => {
    BaseDockerClient.prototype.killContainerAsync.returns(Promise.resolve())
    Swarm.prototype.swarmHostExistsAsync.returns()
    rabbitmq.publishDockRemoved.returns()
    DockExistsCheck(testJob).asCallback((err) => {
      if (err) { return done(err) }

      sinon.assert.calledOnce(BaseDockerClient.prototype.killContainerAsync)
      sinon.assert.calledWith(BaseDockerClient.prototype.killContainerAsync, 'swarm')
      done()
    })
  })

  it('should call swarmHostExistsAsync', (done) => {
    BaseDockerClient.prototype.killContainerAsync.returns(Promise.resolve())
    Swarm.prototype.swarmHostExistsAsync.returns()
    rabbitmq.publishDockRemoved.returns()
    DockExistsCheck(testJob).asCallback((err) => {
      if (err) { return done(err) }

      sinon.assert.calledOnce(Swarm.prototype.swarmHostExistsAsync)
      sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, '10.0.0.2:4242')
      done()
    })
  })

  it('should call swarmHostExistsAsync if kill failed', (done) => {
    BaseDockerClient.prototype.killContainerAsync.rejects('failed')
    Swarm.prototype.swarmHostExistsAsync.returns()
    rabbitmq.publishDockRemoved.returns()
    DockExistsCheck(testJob).asCallback((err) => {
      if (err) { return done(err) }

      sinon.assert.calledOnce(Swarm.prototype.swarmHostExistsAsync)
      sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, '10.0.0.2:4242')
      done()
    })
  })

  it('should throw WorkerError if exists', (done) => {
    BaseDockerClient.prototype.killContainerAsync.resolves()
    Swarm.prototype.swarmHostExistsAsync.resolves(true)
    DockExistsCheck(testJob).asCallback((err) => {
      expect(err).instanceOf(WorkerError)

      sinon.assert.notCalled(rabbitmq.publishDockRemoved)
      done()
    })
  })

  it('should publishDockRemoved if not exists', (done) => {
    BaseDockerClient.prototype.killContainerAsync.resolves()
    Swarm.prototype.swarmHostExistsAsync.resolves(false)
    DockExistsCheck(testJob).asCallback((err) => {
      if (err) { return done(err) }

      sinon.assert.calledOnce(rabbitmq.publishDockRemoved)
      sinon.assert.calledWith(rabbitmq.publishDockRemoved, testJob)
      done()
    })
  })
})
