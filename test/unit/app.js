'use strict'
require('loadenv')()

var Promise = require('bluebird')
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
var rabbitClient = require('../../lib/external/rabbitmq.js')
var App = require('../../lib/app.js')
var workerServer = require('../../lib/workers/server')

describe('app.js unit test', function () {
  var app
  beforeEach(function (done) {
    app = new App()
    done()
  })

  describe('start', function () {
    beforeEach(function (done) {
      sinon.stub(rabbitClient, 'connect').resolves()
      sinon.stub(workerServer, 'start').resolves()
      sinon.stub(rabbitClient, 'publishHealthCheck')
      process.env.COLLECT_INTERVAL = 1
      done()
    })

    afterEach(function (done) {
      rabbitClient.connect.restore()
      rabbitClient.publishHealthCheck.restore()
      workerServer.start.restore()
      delete process.env.COLLECT_INTERVAL
      if (app.interval) {
        clearInterval(app.interval)
      }
      done()
    })

    it('should setup service', function (done) {
      rabbitClient.publishHealthCheck.returns()

      app.start(function (err) {
        expect(err).to.not.exist()
        expect(rabbitClient.connect.called).to.be.true()
        expect(app.interval).to.exist()
        setTimeout(function () {
          expect(rabbitClient.publishHealthCheck.callCount)
            .to.be.above(1)
          done()
        }, 10)
      })
    })

    it('should err if connect failed', function (done) {
      var testErr = 'flop'
      rabbitClient.connect.rejects(testErr)

      app.start(function (err) {
        expect(err).to.exist()
        expect(rabbitClient.connect.called).to.be.true()
        expect(rabbitClient.publishHealthCheck.called).to.be.false()
        expect(app.interval).to.not.exist()

        done()
      })
    })
  }) // end start

  describe('stop', function () {
    beforeEach(function (done) {
      sinon.stub(rabbitClient, 'disconnect').resolves()
      sinon.stub(workerServer, 'stop').resolves()
      done()
    })

    afterEach(function (done) {
      rabbitClient.disconnect.restore()
      workerServer.stop.restore()
      done()
    })

    it('should setup service', function (done) {
      app.stop(function (err) {
        expect(err).to.not.exist()
        expect(app.interval).to.not.exist()
        done()
      })
    })

    it('should err if close failed', function (done) {
      var testErr = new Error('flop')
      rabbitClient.disconnect.rejects(testErr)

      app.stop(function (err) {
        expect(err.message).to.equal(testErr.message)
        expect(rabbitClient.disconnect.called).to.be.true()
        expect(app.interval).to.not.exist()
        done()
      })
    })
  }) // end stop
})
