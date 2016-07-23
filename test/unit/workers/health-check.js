'use strict'

require('loadenv')()

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const Code = require('code')
const expect = Code.expect

const sinon = require('sinon')
const Promise = require('bluebird')
require('sinon-as-promised')(Promise)
const ErrorCat = require('error-cat')

const HealthCheck = require('../../../lib/workers/health-check')
const rabbitmq = require('../../../lib/external/rabbitmq')
const swarm = require('../../../lib/external/swarm')

describe('health-check.js unit test', function () {
  beforeEach(function (done) {
    sinon.stub(swarm.prototype, 'getHostsWithOrgs')
    sinon.stub(rabbitmq, 'publishDockerHealthCheck')
    sinon.stub(ErrorCat, 'report')
    done()
  })

  afterEach(function (done) {
    swarm.prototype.getHostsWithOrgs.restore()
    rabbitmq.publishDockerHealthCheck.restore()
    ErrorCat.report.restore()
    done()
  })

  it('should call publishDockerHealthCheck for each host', function (done) {
    const testHosts = [{
      Host: 'host1',
      org: '11111'
    }, {
      Host: 'host2',
      org: '2222'
    }, {
      Host: 'host3',
      org: '3333'
    }]
    swarm.prototype.getHostsWithOrgs.resolves(testHosts)
    rabbitmq.publishDockerHealthCheck.returns()

    HealthCheck(null).asCallback(function (err) {
      if (err) { done(err) }
      sinon.assert.calledThrice(rabbitmq.publishDockerHealthCheck)
      sinon.assert.calledWith(rabbitmq.publishDockerHealthCheck, {
        dockerHost: 'http://host1',
        githubId: '11111'
      })
      sinon.assert.calledWith(rabbitmq.publishDockerHealthCheck, {
        dockerHost: 'http://host2',
        githubId: '2222'
      })
      sinon.assert.calledWith(rabbitmq.publishDockerHealthCheck, {
        dockerHost: 'http://host3',
        githubId: '3333'
      })
      done()
    })
  })

  it('should not error if node is malformed', function (done) {
    var testHosts = [{
      Host: 'host1',
      Labels: {}
    }]
    swarm.prototype.getHostsWithOrgs.resolves(testHosts)
    rabbitmq.publishDockerHealthCheck.throws(new Error('bad'))

    HealthCheck(null).asCallback(function (err) {
      if (err) { done(err) }
      sinon.assert.calledOnce(rabbitmq.publishDockerHealthCheck)
      sinon.assert.calledOnce(ErrorCat.report)

      done()
    })
  })

  it('should cb err', function (done) {
    var testErr = 'rock smash'
    swarm.prototype.getHostsWithOrgs.rejects(testErr)

    HealthCheck(null).asCallback(function (err) {
      expect(err).to.exist()
      expect(rabbitmq.publishDockerHealthCheck.called)
        .to.be.false()

      done()
    })
  })
})
