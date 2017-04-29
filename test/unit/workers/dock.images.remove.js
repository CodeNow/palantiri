'use strict'
require('loadenv')()
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const Docker = require('../../../lib/external/docker.js')
const Helpers = require('../../../lib/workers/shared/helpers.js')
const rabbitmq = require('../../../lib/external/rabbitmq.js')
const Worker = require('../../../lib/workers/dock.images.remove.js').task

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const it = lab.it

describe('dock.images.remove.js unit test', () => {
  const testImageId = '123124'
  const testJob = {
    host: '10.0.0.2:4242'
  }

  beforeEach(done => {
    process.env.USER_REGISTRY = 'local'
    sinon.stub(Docker.prototype, 'listImages')
    sinon.stub(Docker.prototype, 'listDanglingVolumes')
    sinon.stub(Helpers, 'ensureDockExists').resolves()
    sinon.stub(rabbitmq, 'publishTask')
    done()
  })

  afterEach(done => {
    delete process.env.USER_REGISTRY
    Docker.prototype.listImages.restore()
    Docker.prototype.listDanglingVolumes.restore()
    Helpers.ensureDockExists.restore()
    rabbitmq.publishTask.restore()
    done()
  })
  describe('images', () => {
    beforeEach(done => {
      Docker.prototype.listDanglingVolumes.resolves([])
      done()
    })

    it('should publish nothing if no images ', done => {
      Docker.prototype.listImages.resolves([ ])
      Worker(testJob).asCallback(err => {
        if (err) { return done(err) }
        sinon.assert.notCalled(rabbitmq.publishTask)
        done()
      })
    })

    it('should publish if no RepoTags', done => {
      Docker.prototype.listImages.resolves([ {Id: testImageId} ])
      Worker(testJob).asCallback(err => {
        if (err) { return done(err) }
        sinon.assert.calledOnce(rabbitmq.publishTask)
        sinon.assert.calledWith(rabbitmq.publishTask, 'image.remove', {
          imageTag: testImageId,
          host: testJob.host
        })
        done()
      })
    })

    it('should publish if not correct tag', done => {
      Docker.prototype.listImages.resolves([ {
        RepoTags: [ 'some', 'weird', 'tags' ],
        Id: testImageId
      } ])
      Worker(testJob).asCallback(err => {
        if (err) { return done(err) }
        sinon.assert.calledOnce(rabbitmq.publishTask)
        sinon.assert.calledWith(rabbitmq.publishTask, 'image.remove', {
          imageTag: testImageId,
          host: testJob.host
        })
        done()
      })
    })

    it('should publish if one correct tag', done => {
      const testImage = 'localhost/321/123:124'
      Docker.prototype.listImages.resolves([ {
        RepoTags: [ 'weird', testImage, 'tags' ],
        Id: testImageId
      } ])
      Worker(testJob).asCallback(err => {
        if (err) { return done(err) }
        sinon.assert.calledOnce(rabbitmq.publishTask)
        sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
          imageTag: testImage,
          host: testJob.host
        })
        done()
      })
    })

    it('should publish for all images', done => {
      const testImage1 = 'localhost/123/123:124'
      const testImage2 = 'localhost/321/321:boo'
      Docker.prototype.listImages.resolves([ {
        RepoTags: [ 'weird', testImage1, 'tags' ],
        Id: '1'
      }, {
        RepoTags: [ testImage2 ],
        Id: '2'
      }, {
        RepoTags: [ 'weird', 'tags' ],
        Id: testImageId
      } ])
      Worker(testJob).asCallback(err => {
        if (err) { return done(err) }
        sinon.assert.calledThrice(rabbitmq.publishTask)
        sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
          imageTag: testImage1,
          host: testJob.host
        })
        sinon.assert.calledWith(rabbitmq.publishTask, 'image.push', {
          imageTag: testImage2,
          host: testJob.host
        })
        sinon.assert.calledWith(rabbitmq.publishTask, 'image.remove', {
          imageTag: testImageId,
          host: testJob.host
        })
        done()
      })
    })

    it('should publish remove for untagged container', done => {
      const testId = 'blue cat'
      Docker.prototype.listImages.resolves([ {
        Id: testId,
        RepoTags: [ '<none>:<none>' ]
      } ])
      Worker(testJob).asCallback(err => {
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
})
