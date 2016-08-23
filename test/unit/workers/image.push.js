'use strict'
require('loadenv')()
const Code = require('code')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')
const WorkerStopError = require('error-cat/errors/worker-error')

const Docker = require('../../../lib/external/docker.js')
const Swarm = require('../../../lib/external/swarm.js')
const Worker = require('../../../lib/workers/image.push.js').task
const rabbitmq = require('../../../lib/external/rabbitmq.js')

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = Code.expect
const it = lab.it

describe('dock.exists-check.js unit test', () => {
  const testJob = {
    host: '10.0.0.2:4242',
    Docker: 'chill/fire:ice'
  }

  beforeEach((done) => {
    sinon.stub(Swarm.prototype, 'swarmHostExistsAsync')
    sinon.stub(Docker.prototype, 'pushImage')
    sinon.stub(rabbitmq, 'publishImageTask')
    done()
  })

  afterEach((done) => {
    Swarm.prototype.swarmHostExistsAsync.restore()
    Docker.prototype.pushImage.restore()
    rabbitmq.publishImageTask.restore()
    done()
  })

  it('should WorkerStopError if does does not exist', (done) => {
    Swarm.prototype.swarmHostExistsAsync.returns(Promise.resolve())
    Worker(testJob).asCallback((err) => {
      expect(err).to.be.an.instanceOf(WorkerStopError)
      sinon.assert.calledOnce(Swarm.prototype.swarmHostExistsAsync)
      sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, testJob.host)
      done()
    })
  })

  it('should call in right order and right params', (done) => {
    Swarm.prototype.swarmHostExistsAsync.returns(Promise.resolve(true))
    Docker.prototype.pushImage.returns(Promise.resolve())
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.callOrder(
        Swarm.prototype.swarmHostExistsAsync,
        Docker.prototype.pushImage,
        rabbitmq.publishImageTask
      )
      sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, testJob.host)
      sinon.assert.calledWith(Docker.prototype.swarmHostExistsAsync, testJob.Docker)
      sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, testJob)
      done()
    })
  })
})
