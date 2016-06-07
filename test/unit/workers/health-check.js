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

var HealthCheck = require('../../../lib/workers/health-check.js')
var rabbitmq = require('../../../lib/external/rabbitmq.js')
var mavisClient = require('../../../lib/external/mavis.js')

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
      sinon.stub(mavisClient, 'getDocks')
      sinon.stub(rabbitmq, 'publishDockerHealthCheck')
      done()
    })

    afterEach(function (done) {
      mavisClient.getDocks.restore()
      rabbitmq.publishDockerHealthCheck.restore()
      done()
    })

    it('should call publishDockerHealthCheck for each host', function (done) {
      var testHosts = [{
        host: 'host1',
        tags: '11111,build,run'
      }, {
        host: 'host2',
        tags: 'build,2222,run'
      }, {
        host: 'host3',
        tags: 'run,build,3333'
      }]
      mavisClient.getDocks.yieldsAsync(null, testHosts)
      rabbitmq.publishDockerHealthCheck.returns()

      healthCheck.handle(null, function (err) {
        expect(err).to.not.exist()
        expect(rabbitmq.publishDockerHealthCheck.withArgs({
          dockerHost: 'host1',
          githubId: 11111
        }).called).to.be.true()
        expect(rabbitmq.publishDockerHealthCheck.withArgs({
          dockerHost: 'host2',
          githubId: 2222
        }).called).to.be.true()
        expect(rabbitmq.publishDockerHealthCheck.withArgs({
          dockerHost: 'host3',
          githubId: 3333
        }).called).to.be.true()

        done()
      })
    })

    it('should use default if no githubId', function (done) {
      var testHosts = [{
        host: 'host1',
        tags: 'notGithubId'
      }]
      mavisClient.getDocks.yieldsAsync(null, testHosts)
      rabbitmq.publishDockerHealthCheck.returns()

      healthCheck.handle(null, function (err) {
        expect(err).to.not.exist()
        expect(rabbitmq.publishDockerHealthCheck.withArgs({
          dockerHost: 'host1',
          githubId: 'default'
        }).called).to.be.true()

        done()
      })
    })

    it('should cb err', function (done) {
      var testErr = 'rock smash'
      mavisClient.getDocks.yieldsAsync(testErr)

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
