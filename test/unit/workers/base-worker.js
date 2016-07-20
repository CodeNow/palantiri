'use strict'

require('loadenv')()

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var beforeEach = lab.beforeEach
var Code = require('code')
var expect = Code.expect

var sinon = require('sinon')

var BaseWorker = require('../../../lib/workers/base-worker.js')

describe('base-worker.js unit test', function () {
  var baseWorker
  beforeEach(function (done) {
    baseWorker = new BaseWorker({
      name: 'test-name'
    })

    done()
  })

  describe('constructor', function () {
    it('should set name and logData', function (done) {
      var testName = 'faze'

      var testWorker = new BaseWorker({
        name: testName
      })

      expect(testWorker.name).to.equal(testName)
      expect(testWorker.logData).to.exist()

      done()
    })

    it('should throw if missing name', function (done) {
      var worker
      expect(function () {
        worker = new BaseWorker()
      }).to.throw()
      expect(worker).to.not.exist()
      done()
    })
  }) // end constructor

  describe('worker', function () {
    beforeEach(function (done) {
      sinon.stub(baseWorker, 'handle')
      sinon.stub(baseWorker, 'isDataValid')
      done()
    })

    it('should run handle', function (done) {
      var testData = {
        summon: 'Icen'
      }
      baseWorker.handle.yieldsAsync()
      baseWorker.isDataValid.returns(true)

      baseWorker.worker(testData, function (err) {
        expect(err).to.not.exist()
        expect(baseWorker.handle.withArgs(testData).called)
          .to.be.true()

        done()
      })
    })

    it('should not return handle err', function (done) {
      var testErr = 'vine whip'
      baseWorker.handle.yieldsAsync(testErr)
      baseWorker.isDataValid.returns(true)

      baseWorker.worker({}, function (err) {
        expect(err).to.not.exist()
        done()
      })
    })
  }) // end worker

  describe('handle', function () {
    it('should throw if not implemented', function (done) {
      expect(function () {
        baseWorker.handle()
      }).to.throw()
      done()
    })
  }) // end handle

  describe('isDataValid', function () {
    it('should throw if not implemented', function (done) {
      expect(function () {
        baseWorker.isDataValid()
      }).to.throw()
      done()
    })
  }) // end isDataValid

  describe('handleDomainError', function () {
    it('should log error', function (done) {
      baseWorker.handleDomainError()
      done()
    })
  }) // end handleDomainError
})
