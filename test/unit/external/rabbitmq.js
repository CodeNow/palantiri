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
    done()
  })
  afterEach(function (done) {
    rabbitClient.publishTask.restore()
    done()
  })
  describe('publishHealthCheck', function () {
    it('should publish health-check', function (done) {
      rabbitClient.publishHealthCheck()
      expect(rabbitClient.publishTask
        .withArgs('health-check').called).to.be.true()
      expect(rabbitClient.publishTask
        .args[0][1].timestamp).to.exist()
      expect(rabbitClient.publishTask
        .args[0][1].healthCheckId).to.exist()
      done()
    })
  }) // end publishHealthCheck

  describe('publishDockerHealthCheck', function () {
    it('should publish docker-health-check', function (done) {
      var testData = {
        dockerHost: 'testHost',
        githubId: 1253543
      }
      rabbitClient.publishDockerHealthCheck(testData)

      expect(rabbitClient.publishTask
        .withArgs('docker-health-check').called).to.be.true()
      expect(rabbitClient.publishTask
        .args[0][1].timestamp).to.exist()
      expect(rabbitClient.publishTask
        .args[0][1].dockerHealthCheckId).to.exist()
      expect(rabbitClient.publishTask
        .args[0][1].dockerHost).to.equal(testData.dockerHost)
      expect(rabbitClient.publishTask
        .args[0][1].githubId).to.equal(testData.githubId)

      done()
    })

    it('should throw if missing keys', function (done) {
      var testData = {
        dockerHost: 'testHost',
        githubId: 1253543
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

  describe('publishOnDockUnhealthy', function () {
    it('should publish on-dock-unhealthy', function (done) {
      var testData = {
        host: 'testHost',
        githubId: 1253543
      }
      rabbitClient.publishOnDockUnhealthy(testData)

      expect(rabbitClient.publishTask
        .withArgs('on-dock-unhealthy').called).to.be.true()
      expect(rabbitClient.publishTask
        .args[0][1].timestamp).to.exist()
      expect(rabbitClient.publishTask
        .args[0][1].dockerHealthCheckId).to.exist()
      expect(rabbitClient.publishTask
        .args[0][1].host).to.equal(testData.host)
      expect(rabbitClient.publishTask
        .args[0][1].githubId).to.equal(testData.githubId)

      done()
    })

    it('should throw if missing keys', function (done) {
      var testData = {
        host: 'testHost',
        githubId: 1253543
      }

      Object.keys(testData).forEach(function (key) {
        var test = clone(testData)
        delete test[key]
        expect(function () {
          rabbitClient.publishOnDockUnhealthy(test)
        }).to.throw()
      })

      done()
    })
  }) // end publishOnDockUnhealthy

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
