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

var rabbitClient = require('../../lib/external/rabbitmq.js')
var App = require('../../lib/app.js')

describe('app.js unit test', function () {
  var app
  beforeEach(function (done) {
    app = new App()
    done()
  })

  describe('start', function () {
    beforeEach(function (done) {
      sinon.stub(rabbitClient, 'connect')
      sinon.stub(rabbitClient, 'loadWorkers')
      sinon.stub(rabbitClient, 'publishHealthCheck')
      process.env.COLLECT_INTERVAL = 1
      done()
    })

    afterEach(function (done) {
      rabbitClient.connect.restore()
      rabbitClient.loadWorkers.restore()
      rabbitClient.publishHealthCheck.restore()
      delete process.env.COLLECT_INTERVAL
      if (app.interval) {
        clearInterval(app.interval)
      }
      done()
    })

    it('should setup service', function (done) {
      rabbitClient.connect.yieldsAsync()
      rabbitClient.loadWorkers.returns()
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
      rabbitClient.connect.yieldsAsync(testErr)

      app.start(function (err) {
        expect(err).to.exist()
        expect(rabbitClient.connect.called).to.be.true()
        expect(rabbitClient.publishHealthCheck.called).to.be.false()
        expect(app.interval).to.not.exist()

        done()
      })
    })

    it('should not throw on domain error', function (done) {
      rabbitClient.connect.throws()

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
      sinon.stub(rabbitClient, 'unloadWorkers')
      sinon.stub(rabbitClient, 'close')
      done()
    })

    afterEach(function (done) {
      rabbitClient.unloadWorkers.restore()
      rabbitClient.close.restore()
      done()
    })

    it('should setup service', function (done) {
      rabbitClient.unloadWorkers.yieldsAsync()
      rabbitClient.close.yieldsAsync()

      app.stop(function (err) {
        expect(err).to.not.exist()
        expect(rabbitClient.unloadWorkers.called).to.be.true()
        expect(app.interval).to.not.exist()
        done()
      })
    })

    it('should not err if unloadWorkers failed', function (done) {
      var testErr = 'flop'
      rabbitClient.unloadWorkers.yieldsAsync(testErr)
      rabbitClient.close.yieldsAsync()

      app.stop(function (err) {
        expect(err).to.not.exist()
        expect(rabbitClient.unloadWorkers.called).to.be.true()
        expect(rabbitClient.close.called).to.be.true()
        expect(app.interval).to.not.exist()

        done()
      })
    })

    it('should not err if close failed', function (done) {
      var testErr = 'flop'
      rabbitClient.unloadWorkers.yieldsAsync()
      rabbitClient.close.yieldsAsync(testErr)

      app.stop(function (err) {
        expect(err).to.not.exist()
        expect(rabbitClient.unloadWorkers.called).to.be.true()
        expect(rabbitClient.close.called).to.be.true()
        expect(app.interval).to.not.exist()

        done()
      })
    })

    it('should not throw on domain error', function (done) {
      rabbitClient.unloadWorkers.throws()

      app.stop(function (err) {
        expect(err).to.exist()
        expect(rabbitClient.unloadWorkers.called).to.be.true()
        expect(app.interval).to.not.exist()

        done()
      })
    })
  }) // end stop
})
