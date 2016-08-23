'use strict'
require('loadenv')()
const Code = require('code')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')
const str = require('string-to-stream')

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
    process.env.DOCKER_RETRY_ATTEMPTS = 2
    process.env.DOCKER_RETRY_INTERVAL = 1
    docker = new Docker(testHost)
    done()
  })

  afterEach(function (done) {
    delete process.env.DOCKER_RETRY_ATTEMPTS
    delete process.env.DOCKER_RETRY_INTERVAL
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

  describe('pullImage', function () {
    const testImage = 'runnable/libra'
    beforeEach(function (done) {
      sinon.stub(docker.client, 'pull')
      sinon.stub(docker.client.modem, 'followProgress')
      done()
    })

    afterEach(function (done) {
      docker.client.pull.restore()
      docker.client.modem.followProgress.restore()
      done()
    })

    it('should call pull', function (done) {
      const testStream = 'thisisatest'
      docker.client.pull.yieldsAsync(null, testStream)
      docker.client.modem.followProgress.yieldsAsync(null)

      docker.pullImage(testImage).asCallback(function (err) {
        expect(err).to.not.exist()
        expect(docker.client.pull
          .withArgs(testImage).calledOnce).to.be.true()
        expect(docker.client.modem.followProgress
          .withArgs(testStream).calledOnce).to.be.true()

        done()
      })
    })

    it('should retry if pull failed', function (done) {
      const testStream = 'thisisatest'
      docker.client.pull.onCall(0).yieldsAsync('error')
      docker.client.pull.onCall(1).yieldsAsync(null, testStream)
      docker.client.modem.followProgress.yieldsAsync(null)

      docker.pullImage(testImage).asCallback(function (err) {
        expect(err).to.not.exist()
        expect(docker.client.pull
          .withArgs(testImage).calledTwice).to.be.true()
        expect(docker.client.modem.followProgress
          .withArgs(testStream).calledOnce).to.be.true()

        done()
      })
    })

    it('should retry if followProgress failed', function (done) {
      const testStream = 'thisisatest'
      docker.client.pull.yieldsAsync(null, testStream)
      docker.client.modem.followProgress.onCall(0).yieldsAsync('error')
      docker.client.modem.followProgress.onCall(1).yieldsAsync(null)

      docker.pullImage(testImage).asCallback(function (err) {
        expect(err).to.not.exist()
        expect(docker.client.pull
          .withArgs(testImage).calledTwice).to.be.true()
        expect(docker.client.modem.followProgress
          .withArgs(testStream).calledTwice).to.be.true()

        done()
      })
    })

    it('should cb error if failed over retry count', function (done) {
      const testError = 'explode'
      docker.client.pull.onCall(0).yieldsAsync(testError)
      docker.client.pull.onCall(1).yieldsAsync(testError)
      docker.pullImage(testImage).asCallback(function (err) {
        expect(err.message).to.equal(testError)
        expect(docker.client.pull.withArgs(testImage).calledTwice).to.be.true()

        done()
      })
    })
  }) // end pullImage

  describe('createContainer', function () {
    beforeEach(function (done) {
      sinon.stub(docker.client, 'createContainer')
      done()
    })

    afterEach(function (done) {
      docker.client.createContainer.restore()
      done()
    })

    it('should call createContainer', function (done) {
      const testRes = 'thisisatest'
      const testArgs = 'testArg'
      docker.client.createContainer.yieldsAsync(null, testRes)
      docker.createContainer(testArgs).asCallback(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.equal(testRes)
        expect(docker.client.createContainer.withArgs(testArgs).calledOnce).to.be.true()

        done()
      })
    })

    it('should retry if failed', function (done) {
      const testRes = 'thisisatest'
      const testArgs = 'testArg'
      docker.client.createContainer.onCall(0).yieldsAsync('error')
      docker.client.createContainer.onCall(1).yieldsAsync(null, testRes)
      docker.createContainer(testArgs).asCallback(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.equal(testRes)
        expect(docker.client.createContainer.withArgs(testArgs).calledTwice).to.be.true()

        done()
      })
    })

    it('should cb error if failed over retry count', function (done) {
      const testError = 'explode'
      const testArgs = 'testArg'
      docker.client.createContainer.onCall(0).yieldsAsync(testError)
      docker.client.createContainer.onCall(1).yieldsAsync(testError)
      docker.createContainer(testArgs).asCallback(function (err) {
        expect(err.message).to.equal(testError)
        expect(docker.client.createContainer.withArgs(testArgs).calledTwice).to.be.true()

        done()
      })
    })
  }) // end createContainer

  describe('startContainer', function () {
    var containerMock
    beforeEach(function (done) {
      containerMock = {
        start: sinon.stub()
      }
      done()
    })

    it('should call startContainer', function (done) {
      var testRes = 'thisisatest'
      containerMock.start.yieldsAsync(null, testRes)
      docker.startContainer(containerMock).asCallback(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.equal(testRes)
        expect(containerMock.start.calledOnce).to.be.true()

        done()
      })
    })

    it('should retry if failed', function (done) {
      var testRes = 'thisisatest'
      containerMock.start.onCall(0).yieldsAsync('error')
      containerMock.start.onCall(1).yieldsAsync(null, testRes)
      docker.startContainer(containerMock).asCallback(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.equal(testRes)
        expect(containerMock.start.calledTwice).to.be.true()

        done()
      })
    })

    it('should cb error if failed over retry count', function (done) {
      var testError = 'explode'
      containerMock.start.onCall(0).yieldsAsync(testError)
      containerMock.start.onCall(1).yieldsAsync(testError)
      docker.startContainer(containerMock).asCallback(function (err) {
        expect(err.message).to.equal(testError)
        expect(containerMock.start.calledTwice).to.be.true()

        done()
      })
    })
  }) // end startContainer

  describe('removeContainer', function () {
    var containerMock
    beforeEach(function (done) {
      containerMock = {
        remove: sinon.stub()
      }
      done()
    })

    it('should call removeContainer', function (done) {
      var testRes = 'thisisatest'
      containerMock.remove.yieldsAsync(null, testRes)
      docker.removeContainer(containerMock).asCallback(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.equal(testRes)
        expect(containerMock.remove.calledOnce).to.be.true()

        done()
      })
    })

    it('should retry if failed', function (done) {
      var testRes = 'thisisatest'
      containerMock.remove.onCall(0).yieldsAsync('error')
      containerMock.remove.onCall(1).yieldsAsync(null, testRes)
      docker.removeContainer(containerMock).asCallback(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.equal(testRes)
        expect(containerMock.remove.calledTwice).to.be.true()

        done()
      })
    })

    it('should cb error if failed over retry count', function (done) {
      var testError = 'explode'
      containerMock.remove.onCall(0).yieldsAsync(testError)
      containerMock.remove.onCall(1).yieldsAsync(testError)
      docker.removeContainer(containerMock).asCallback(function (err) {
        expect(err.message).to.equal(testError)
        expect(containerMock.remove.calledTwice).to.be.true()
        done()
      })
    })
  }) // end removeContainer

  describe('containerLogs', function () {
    var containerMock
    beforeEach(function (done) {
      containerMock = {
        isErr: false,
        logs: sinon.stub(),
        modem: {
          demuxStream: function (input, stdout, stderr) {
            if (containerMock.isErr) {
              input.on('data', function (d) {
                stderr.write(d)
              })
            } else {
              input.on('data', function (d) {
                stdout.write(d)
              })
            }
          }
        }
      }
      done()
    })

    it('should get logs', function (done) {
      var testLog = 'thisisatest'
      containerMock.logs.yieldsAsync(null, str(testLog))

      docker.containerLogs(containerMock).asCallback(function (err, logs) {
        expect(err).to.not.exist()
        expect(logs).to.equal(testLog)
        expect(containerMock.logs.calledOnce).to.be.true()

        done()
      })
    })

    it('should cb error is stream error', function (done) {
      containerMock.isErr = true
      var testLogLog = 'thisisatest'
      process.env.DOCKER_RETRY_ATTEMPTS = 1
      containerMock.logs.yields(null, str(testLogLog))

      docker.containerLogs(containerMock).asCallback(function (err) {
        expect(err.message).to.equal(testLogLog)
        expect(containerMock.logs.calledOnce).to.be.true()

        done()
      })
    })

    it('should retry if failed', function (done) {
      var testLog = 'thisisatest'
      containerMock.logs.onCall(0).yieldsAsync('error')
      containerMock.logs.onCall(1).yieldsAsync(null, str(testLog))
      docker.containerLogs(containerMock).asCallback(function (err, logs) {
        expect(err).to.not.exist()
        expect(logs).to.equal(testLog)
        expect(containerMock.logs.calledTwice).to.be.true()

        done()
      })
    })

    it('should cb error if failed over retry count', function (done) {
      var testError = 'explode'
      containerMock.logs.onCall(0).yieldsAsync(testError)
      containerMock.logs.onCall(1).yieldsAsync(testError)
      docker.containerLogs(containerMock).asCallback(function (err) {
        expect(err.message).to.equal(testError)
        expect(containerMock.logs.calledTwice).to.be.true()

        done()
      })
    })
  }) // end containerLogs
})
