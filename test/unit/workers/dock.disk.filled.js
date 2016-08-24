'use strict'
require('loadenv')()
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const Docker = require('../../../lib/external/docker.js')
const Helpers = require('../../../lib/workers/shared/helpers.js')
const rabbitmq = require('../../../lib/external/rabbitmq.js')
const Worker = require('../../../lib/workers/dock.disk.filled.js').task

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const it = lab.it

describe('dock.exists-check.js unit test', () => {
  const testJob = {
    host: '10.0.0.2:4242'
  }

  beforeEach((done) => {
    process.env.USER_REGISTRY = 'local'
    sinon.stub(Docker.prototype, 'listImages')
    sinon.stub(Helpers, 'ensureDockExists').resolves()
    sinon.stub(rabbitmq, 'publishTask')
    done()
  })

  afterEach((done) => {
    delete process.env.USER_REGISTRY
    Docker.prototype.listImages.restore()
    Helpers.ensureDockExists.restore()
    rabbitmq.publishTask.restore()
    done()
  })

  it('should not publish if no RepoTags', (done) => {
    Docker.prototype.listImages.resolves([{}])
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.notCalled(rabbitmq.publishTask)
      done()
    })
  })

  it('should not publish if not correct tag', (done) => {
    Docker.prototype.listImages.resolves([{
      RepoTags: ['some', 'weird', 'tags']
    }])
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.notCalled(rabbitmq.publishTask)
      done()
    })
  })

  it('should publish if one correct tag', (done) => {
    const testImage = 'localhost/321/123:124'
    Docker.prototype.listImages.resolves([{
      RepoTags: ['weird', testImage, 'tags']
    }])
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.calledOnce(rabbitmq.publishTask)
      sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
        imageTag: testImage,
        host: testJob.host
      })
      done()
    })
  })

  it('should call in right order', (done) => {
    const testImage = 'localhost/123/123:124'
    Docker.prototype.listImages.resolves([{
      RepoTags: ['weird', testImage, 'tags']
    }])
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.callOrder(
        Helpers.ensureDockExists,
        Docker.prototype.listImages,
        rabbitmq.publishTask
        )
      done()
    })
  })

  it('should publish for all valid tags', (done) => {
    const testImage1 = 'localhost/123/123:124'
    const testImage2 = 'localhost/321/321:boo'
    Docker.prototype.listImages.resolves([{
      RepoTags: ['weird', testImage1, 'tags']
    }, {
      RepoTags: [testImage2]
    }, {
      RepoTags: ['weird', 'tags']
    }])
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.calledTwice(rabbitmq.publishTask)
      sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
        imageTag: testImage1,
        host: testJob.host
      })
      sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
        imageTag: testImage2,
        host: testJob.host
      })
      done()
    })
  })

  it('should publish remove for untagged container', (done) => {
    const testId = 'blue cat'
    Docker.prototype.listImages.resolves([{
      Id: testId,
      RepoTags: ['<none>:<none>']
    }])
    Worker(testJob).asCallback((err) => {
      if (err) { return done(err) }
      sinon.assert.calledOnce(rabbitmq.publishTask)
      sinon.assert.calledWith(rabbitmq.publishTask, 'image.remove', {
        imageTag: testId,
        host: testJob.host
      })
      done()
    })
  })
})
