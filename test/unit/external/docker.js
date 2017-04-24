'use strict'
require('loadenv')()
const Code = require('code')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const Docker = require('../../../lib/external/docker.js')

const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = Code.expect
const it = lab.it

describe('docker.js unit test', function () {
  const testHost = 'http://localhost:4242'
  var docker
  beforeEach(function (done) {
    docker = new Docker(testHost)
    done()
  })

  describe('listImages', function () {
    beforeEach(function (done) {
      sinon.stub(docker, 'listImagesAsync')
      done()
    })

    afterEach(function (done) {
      docker.listImagesAsync.restore()
      done()
    })

    it('should call list images', function (done) {
      docker.listImagesAsync.returns(Promise.resolve())
      docker.listImages().asCallback((err) => {
        if (err) { return done(err) }
        sinon.assert.calledOnce(docker.listImagesAsync)
        sinon.assert.calledWith(docker.listImagesAsync, {
          all: true
        })
        done()
      })
    })
  }) // end listImages

  describe('listDanglingVolumes', function () {
    beforeEach(function (done) {
      sinon.stub(docker, 'listVolumesAsync')
      done()
    })

    afterEach(function (done) {
      docker.listVolumesAsync.restore()
      done()
    })

    it('should call list images', function (done) {
      docker.listVolumesAsync.returns(Promise.resolve())
      docker.listDanglingVolumes().asCallback((err) => {
        if (err) { return done(err) }
        sinon.assert.calledOnce(docker.listVolumesAsync)
        sinon.assert.calledWith(docker.listVolumesAsync, {
          dangling: true
        })
        done()
      })
    })
  })

  describe('removeVolume', function () {
    let removeStub
    beforeEach(function (done) {
      removeStub = {
        remove: sinon.stub().yieldsAsync()
      }
      sinon.stub(docker.client, 'getVolume').returns(removeStub)
      done()
    })

    afterEach(function (done) {
      docker.client.getVolume.restore()
      done()
    })

    it('should call remove', function (done) {
      const testName = 'registry.runnable.com/runnable/eru:v6.0.1'
      docker.removeVolume(testName).asCallback((err) => {
        if (err) { return done(err) }
        sinon.assert.calledOnce(docker.client.getVolume)
        sinon.assert.calledWith(docker.client.getVolume, testName)
        sinon.assert.calledOnce(removeStub.remove)
        sinon.assert.calledWith(removeStub.remove, sinon.match.func)
        done()
      })
    })
  })

  describe('removeImage', function () {
    let removeStub
    beforeEach(function (done) {
      removeStub = {
        remove: sinon.stub().yieldsAsync()
      }
      sinon.stub(docker.client, 'getImage').returns(removeStub)
      done()
    })

    afterEach(function (done) {
      docker.client.getImage.restore()
      done()
    })

    it('should call remove', function (done) {
      const testId = 'registry.runnable.com/runnable/eru:v6.0.1'
      docker.removeImage(testId).asCallback((err) => {
        if (err) { return done(err) }
        sinon.assert.calledOnce(docker.client.getImage)
        sinon.assert.calledWith(docker.client.getImage, testId)
        sinon.assert.calledOnce(removeStub.remove)
        sinon.assert.calledWith(removeStub.remove, sinon.match.func)
        done()
      })
    })
  }) // end removeImage

  describe('pushImage', function () {
    let pushStub
    const testImage = 'chill/fire:ice'
    beforeEach(function (done) {
      pushStub = {
        push: sinon.stub()
      }
      sinon.stub(docker.client, 'getImage').returns(pushStub)
      sinon.stub(docker.client.modem, 'followProgress')
      done()
    })

    afterEach(function (done) {
      docker.client.getImage.restore()
      docker.client.modem.followProgress.restore()
      done()
    })

    it('should call push', function (done) {
      const testStream = 'thisisatest'
      pushStub.push.yieldsAsync(null, testStream)
      docker.client.modem.followProgress.yieldsAsync(null)

      docker.pushImage(testImage).asCallback(function (err) {
        if (err) { return done(err) }
        sinon.assert.calledOnce(docker.client.getImage)
        sinon.assert.calledWith(docker.client.getImage, testImage)
        sinon.assert.calledOnce(pushStub.push)
        sinon.assert.calledWith(pushStub.push, { tag: 'ice' }, sinon.match.func)
        done()
      })
    })

    it('should resolve error', function (done) {
      const testError = 'someerror'
      pushStub.push.yieldsAsync(testError)
      docker.pushImage(testImage).asCallback(function (err) {
        expect(err.message).to.equal(testError)
        done()
      })
    })
  }) // end pushImage
})
