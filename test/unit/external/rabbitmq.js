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
var clone = require('101/clone')

var rabbitClient = require('../../../lib/external/rabbitmq.js')

describe('rabbitmq.js unit test', function () {
  beforeEach(function (done) {
    sinon.stub(rabbitClient, 'publishTask')
    sinon.stub(rabbitClient, 'publishEvent')
    done()
  })
  afterEach(function (done) {
    rabbitClient.publishTask.restore()
    rabbitClient.publishEvent.restore()
    done()
  })
  describe('publishHealthCheck', function () {
    it('should publish health-check', function (done) {
      rabbitClient.publishHealthCheck()
      expect(rabbitClient.publishTask
        .withArgs('health-check').called).to.be.true()
      done()
    })
  }) // end publishHealthCheck

  describe('publishDockerHealthCheck', function () {
    it('should publish docker-health-check', function (done) {
      var testData = {
        dockerHost: 'testHost'
      }
      rabbitClient.publishDockerHealthCheck(testData)

      expect(rabbitClient.publishTask
        .withArgs('docker-health-check').called).to.be.true()
      expect(rabbitClient.publishTask
        .args[0][1].dockerHost).to.equal(testData.dockerHost)

      done()
    })

    it('should throw if missing keys', function (done) {
      var testData = {
        dockerHost: 'testHost'
      }

      Object.keys(testData).forEach(function (key) {
        var test = clone(testData)
        delete test[key]
        expect(function () {
          rabbitClient.publishDockerHealthCheck(test)
        }).to.throw()
      })

      done()
    })
  }) // end publishDockerHealthCheck

  describe('publishDockLost', function () {
    it('should publish dock.lost', function (done) {
      var testData = {
        host: 'testHost'
      }
      rabbitClient.publishDockLost(testData)

      expect(rabbitClient.publishTask
        .withArgs('dock.lost').called).to.be.true()
      expect(rabbitClient.publishTask
        .args[0][1].host).to.equal(testData.host)
      done()
    })

    it('should throw if missing keys', function (done) {
      var testData = {
        host: 'testHost'
      }

      Object.keys(testData).forEach(function (key) {
        var test = clone(testData)
        delete test[key]
        expect(function () {
          rabbitClient.publishDockLost(test)
        }).to.throw()
      })

      done()
    })
  }) // end publishDockLost

  describe('publishDockExistsCheck', function () {
    it('should publish dock.exists-check', function (done) {
      var testData = {
        host: 'testHost'
      }
      rabbitClient.publishDockExistsCheck(testData)

      sinon.assert.calledOnce(rabbitClient.publishTask)
      sinon.assert.calledWith(rabbitClient.publishTask,
        'dock.exists-check',
        testData
      )

      done()
    })

    it('should throw if missing keys', function (done) {
      var testData = {
        host: 'testHost'
      }

      Object.keys(testData).forEach(function (key) {
        var test = clone(testData)
        delete test[key]
        expect(function () {
          rabbitClient.publishDockExistsCheck(test)
        }).to.throw()
      })

      done()
    })
  }) // end publishDockExistsCheck

  describe('publishDockRemoved', function () {
    it('should publish dock.removed', function (done) {
      var testData = {
        host: 'testHost'
      }
      rabbitClient.publishDockRemoved(testData)

      sinon.assert.calledOnce(rabbitClient.publishEvent)
      sinon.assert.calledWith(rabbitClient.publishEvent,
        'dock.removed',
        testData
      )

      done()
    })

    it('should throw if missing keys', function (done) {
      var testData = {
        host: 'testHost'
      }

      Object.keys(testData).forEach(function (key) {
        var test = clone(testData)
        delete test[key]
        expect(function () {
          rabbitClient.publishDockRemoved(test)
        }).to.throw()
      })

      done()
    })
  }) // end publishDockRemoved

  describe('publishASGCheckCreated', function () {
    it('should publish asg.check-created', function (done) {
      var testData = {
        orgName: 'testHost',
        githubId: '1253543',
        createdAt: Date.now()
      }
      rabbitClient.publishASGCheckCreated(testData)

      expect(rabbitClient.publishTask
        .withArgs('asg.check-created').called).to.be.true()
      expect(rabbitClient.publishTask
        .args[0][1].host).to.equal(testData.host)
      expect(rabbitClient.publishTask
        .args[0][1].githubId).to.equal(testData.githubId)

      done()
    })

    it('should throw if missing keys', function (done) {
      var testData = {
        orgName: 'testHost',
        githubId: '1253543',
        createdAt: Date.now()
      }

      Object.keys(testData).forEach(function (key) {
        var test = clone(testData)
        delete test[key]
        expect(function () {
          rabbitClient.publishASGCheckCreated(test)
        }).to.throw()
      })

      done()
    })
  }) // end publishASGCheckCreated

  describe('_dataCheck', function () {
    it('should throw if missing keys', function (done) {
      var testData = {
        summon: 'aeon'
      }
      expect(function () {
        rabbitClient._dataCheck(testData, ['summon', 'spell'])
      }).to.throw()

      done()
    })

    it('should return if keys present', function (done) {
      var testData = {
        summon: 'aeon'
      }
      rabbitClient._dataCheck(testData, ['summon'])

      done()
    })
  }) // end _dataCheck
})
