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
var request = require('requestretry')

var mavisClient = require('../../../lib/external/mavis.js')

describe('mavis.js unit test', function () {
  var testHost = 'http://localhost:4000'
  beforeEach(function (done) {
    process.env.MAVIS_HOST = testHost
    process.env.MAVIS_RETRY_DELAY = 1
    process.env.MAVIS_RETRY_ATTEMPTS = 2
    done()
  })

  afterEach(function (done) {
    delete process.env.MAVIS_HOST
    delete process.env.MAVIS_RETRY_DELAY
    delete process.env.MAVIS_RETRY_ATTEMPTS
    done()
  })

  describe('getDocks', function () {
    var testECONNRESET = new Error('ECONNRESET')
    testECONNRESET.code = 'ECONNRESET'
    beforeEach(function (done) {
      sinon.stub(request.Request, 'request')
      done()
    })

    afterEach(function (done) {
      request.Request.request.restore()
      done()
    })

    it('should return docks', function (done) {
      var testRes = [{ test: 1234 }]
      request.Request.request.onCall(0).yieldsAsync(null, {}, testRes)
      mavisClient.getDocks(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.deep.equal(testRes)
        done()
      })
    })

    it('should retry for 1 ECONNRESET error', function (done) {
      var testRes = [{ test: 1234 }]
      request.Request.request.onCall(0).yieldsAsync(testECONNRESET)
      request.Request.request.onCall(1).yieldsAsync(null, {}, testRes)
      mavisClient.getDocks(function (err, res) {
        expect(err).to.not.exist()
        expect(res).to.deep.equal(testRes)
        done()
      })
    })

    it('should fails for 2 ECONNRESET error', function (done) {
      request.Request.request.onCall(0).yieldsAsync(testECONNRESET)
      request.Request.request.onCall(1).yieldsAsync(testECONNRESET)
      mavisClient.getDocks(function (err) {
        expect(err).to.exist()
        done()
      })
    })

    it('should error if non network error', function (done) {
      var testErr = new Error('ice rocket')
      request.Request.request.onCall(0).yieldsAsync(testErr)
      mavisClient.getDocks(function (err) {
        expect(err).to.exist()
        done()
      })
    })
  }) // end getDocks
})
