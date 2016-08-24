'use strict'
require('loadenv')()
const Code = require('code')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')
const WorkerStopError = require('error-cat/errors/worker-error')

const Docker = require('../../../lib/external/docker.js')
const Swarm = require('../../../lib/external/swarm.js')
const Worker = require('../../../lib/workers/dock.disk.filled.js').task
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
    host: '10.0.0.2:4242'
  }

  beforeEach((done) => {
    process.env.USER_REGISTRY = 'local'
    sinon.stub(Docker.prototype, 'listImages')
    sinon.stub(Swarm.prototype, 'swarmHostExistsAsync')
    sinon.stub(rabbitmq, 'publishTask')
    done()
  })

  afterEach((done) => {
    delete process.env.USER_REGISTRY
    Docker.prototype.listImages.restore()
    Swarm.prototype.swarmHostExistsAsync.restore()
    rabbitmq.publishTask.restore()
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

  it('should not publish if no RepoTags', (done) => {
    Swarm.prototype.swarmHostExistsAsync.returns(Promise.resolve(true))
    Docker.prototype.listImages.returns(Promise.resolve([{}]))
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.notCalled(rabbitmq.publishTask)
      done()
    })
  })

  it('should not publish if not correct tag', (done) => {
    Swarm.prototype.swarmHostExistsAsync.returns(Promise.resolve(true))
    Docker.prototype.listImages.returns(Promise.resolve([{
      RepoTags: ['some', 'weird', 'tags']
    }]))
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.notCalled(rabbitmq.publishTask)
      done()
    })
  })

  it('should publish if one correct tag', (done) => {
    const testImage = 'localhost/321/123:124'
    Swarm.prototype.swarmHostExistsAsync.returns(Promise.resolve(true))
    Docker.prototype.listImages.returns(Promise.resolve([{
      RepoTags: ['weird', testImage, 'tags']
    }]))
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.calledOnce(rabbitmq.publishTask)
      sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
        imageTag: testImage
      })
      done()
    })
  })

  it('should call in right order', (done) => {
    const testImage = 'localhost/123/123:124'
    Swarm.prototype.swarmHostExistsAsync.returns(Promise.resolve(true))
    Docker.prototype.listImages.returns(Promise.resolve([{
      RepoTags: ['weird', testImage, 'tags']
    }]))
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.callOrder(
        Swarm.prototype.swarmHostExistsAsync,
        Docker.prototype.listImages,
        rabbitmq.publishTask
        )
      done()
    })
  })

  it('should publish for all valid tags', (done) => {
    const testImage1 = 'localhost/123/123:124'
    const testImage2 = 'localhost/321/321:boo'
    Swarm.prototype.swarmHostExistsAsync.returns(Promise.resolve(true))
    Docker.prototype.listImages.returns(Promise.resolve([{
      RepoTags: ['weird', testImage1, 'tags']
    }, {
      RepoTags: [testImage2]
    }, {
      RepoTags: ['weird', 'tags']
    }]))
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.calledTwice(rabbitmq.publishTask)
      sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
        imageTag: testImage1
      })
      sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
        imageTag: testImage2
      })
      done()
    })
  })
})
