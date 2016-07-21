'use strict'

require('loadenv')()

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var Code = require('code')
var expect = Code.expect

var sinon = require('sinon')
var str = require('string-to-stream')

var Docker = require('../../../lib/external/docker.js')

describe('docker.js unit test', function () {
  var testHost = 'http://localhost:4242'
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

  describe('pullImage', function () {
    var testImage = 'runnable/libra'
    beforeEach(function (done) {
      sinon.stub(docker.client, 'pull')
      sinon.stub(docker.client.modem, 'followProgress')
      done()
    })

    afterEach(function (done) {
      docker.client.pull.restore()
      done()
    })

    it('should call pull', function (done) {
      var testStream = 'thisisatest'
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
      var testStream = 'thisisatest'
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
      var testStream = 'thisisatest'
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
      var testError = 'explode'
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
      var testRes = 'thisisatest'
      var testArgs = 'testArg'
      docker.client.createContainer.yieldsAsync(null, testRes)
      docker.createContainer(testArgs).asCallback(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.equal(testRes)
        expect(docker.client.createContainer.withArgs(testArgs).calledOnce).to.be.true()

        done()
      })
    })

    it('should retry if failed', function (done) {
      var testRes = 'thisisatest'
      var testArgs = 'testArg'
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
      var testError = 'explode'
      var testArgs = 'testArg'
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
