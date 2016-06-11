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

var HealthCheck = require('../../../lib/workers/health-check')
var rabbitmq = require('../../../lib/external/rabbitmq')
var swarm = require('../../../lib/external/swarm')

describe('health-check.js unit test', function () {
  var healthCheck
  beforeEach(function (done) {
    healthCheck = new HealthCheck()
    done()
  })

  describe('worker', function () {
    beforeEach(function (done) {
      sinon.stub(HealthCheck.prototype, 'worker').yieldsAsync()
      done()
    })

    afterEach(function (done) {
      HealthCheck.prototype.worker.restore()
      done()
    })

    it('should call worker', function (done) {
      var testData = {
        summon: 'Ramuh'
      }
      HealthCheck.prototype.worker.yieldsAsync()

      HealthCheck.worker(testData, function (err) {
        expect(HealthCheck.prototype.worker.withArgs(testData).called)
          .to.be.true()
        expect(err).to.not.exist()

        done()
      })
    })
  }) // end worker

  describe('handle', function () {
    beforeEach(function (done) {
      sinon.stub(swarm.prototype, 'getNodes')
      sinon.stub(rabbitmq, 'publishDockerHealthCheck')
      done()
    })

    afterEach(function (done) {
      swarm.prototype.getNodes.restore()
      rabbitmq.publishDockerHealthCheck.restore()
      done()
    })

    it('should call publishDockerHealthCheck for each host', function (done) {
      var testHosts = [{
        Host: 'host1',
        Labels: {
          org: '11111'
        }
      }, {
        Host: 'host2',
        Labels: {
          org: '2222'
        }
      }, {
        Host: 'host3',
        Labels: {
          org: '3333'
        }
      }]
      swarm.prototype.getNodes.yieldsAsync(null, testHosts)
      rabbitmq.publishDockerHealthCheck.returns()

      healthCheck.handle(null, function (err) {
        expect(err).to.not.exist()
        expect(rabbitmq.publishDockerHealthCheck.withArgs({
          dockerHost: 'http://host1',
          githubId: 11111
        }).called).to.be.true()
        expect(rabbitmq.publishDockerHealthCheck.withArgs({
          dockerHost: 'http://host2',
          githubId: 2222
        }).called).to.be.true()
        expect(rabbitmq.publishDockerHealthCheck.withArgs({
          dockerHost: 'http://host3',
          githubId: 3333
        }).called).to.be.true()

        done()
      })
    })

    it('should use default if no githubId', function (done) {
      var testHosts = [{
        Host: 'host1',
        Labels: {}
      }]
      swarm.prototype.getNodes.yieldsAsync(null, testHosts)
      rabbitmq.publishDockerHealthCheck.returns()

      healthCheck.handle(null, function (err) {
        expect(err).to.not.exist()
        expect(rabbitmq.publishDockerHealthCheck.withArgs({
          dockerHost: 'http://host1',
          githubId: 'default'
        }).called).to.be.true()

        done()
      })
    })

    it('should cb err', function (done) {
      var testErr = 'rock smash'
      swarm.prototype.getNodes.yieldsAsync(testErr)

      healthCheck.handle(null, function (err) {
        expect(err).to.exist()
        expect(rabbitmq.publishDockerHealthCheck.called)
          .to.be.false()

        done()
      })
    })
  }) // end handle

  describe('isDataValid', function () {
    it('should always return true', function (done) {
      [{}, [], null, undefined, false, true, 'hi'].forEach(function (item) {
        expect(healthCheck.isDataValid(item)).to.be.true()
      })

      done()
    })
  }) // end isDataValid
})
