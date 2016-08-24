'use strict'
require('loadenv')()

const Promise = require('bluebird')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const Code = require('code')
const expect = Code.expect

const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const rabbitClient = require('../../lib/external/rabbitmq.js')
const App = require('../../lib/app.js')
const workerServer = require('../../lib/workers/server')

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
      sinon.stub(rabbitClient, 'publishTask')
      process.env.COLLECT_INTERVAL = 1
      done()
    })

    afterEach(function (done) {
      rabbitClient.connect.restore()
      rabbitClient.publishTask.restore()
      workerServer.start.restore()
      delete process.env.COLLECT_INTERVAL
      if (app.interval) {
        clearInterval(app.interval)
      }
      done()
    })

    it('should setup service', function (done) {
      rabbitClient.publishTask.returns()

      app.start().asCallback(function (err) {
        expect(err).to.not.exist()
        expect(rabbitClient.connect.called).to.be.true()
        expect(app.interval).to.exist()
        setTimeout(function () {
          expect(rabbitClient.publishTask.callCount)
            .to.be.above(1)
          done()
        }, 10)
      })
    })

    it('should err if connect failed', function (done) {
      const testErr = 'flop'
      rabbitClient.connect.rejects(testErr)

      app.start().asCallback(function (err) {
        expect(err).to.exist()
        expect(rabbitClient.connect.called).to.be.true()
        expect(rabbitClient.publishTask.called).to.be.false()
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
      app.stop().asCallback(function (err) {
        expect(err).to.not.exist()
        expect(app.interval).to.not.exist()
        done()
      })
    })

    it('should err if close failed', function (done) {
      const testErr = new Error('flop')
      rabbitClient.disconnect.rejects(testErr)

      app.stop().asCallback(function (err) {
        expect(err.message).to.equal(testErr.message)
        expect(rabbitClient.disconnect.called).to.be.true()
        expect(app.interval).to.not.exist()
        done()
      })
    })
  }) // end stop
})
