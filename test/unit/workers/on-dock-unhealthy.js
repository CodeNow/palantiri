'use strict'

require('loadenv')()

const Code = require('code')
const ErrorCat = require('error-cat')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const OnDockUnhealthy = require('../../../lib/workers/on-dock-unhealthy')
const rabbitmq = require('../../../lib/external/rabbitmq')

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = Code.expect
const it = lab.it

describe('health-check.js unit test', function () {
  beforeEach(function (done) {
    sinon.stub(rabbitmq, 'publishDockExistsCheck')
    sinon.stub(ErrorCat, 'report')
    done()
  })

  afterEach(function (done) {
    rabbitmq.publishDockExistsCheck.restore()
    ErrorCat.report.restore()
    done()
  })

  it('should call publishDockExistsCheck for host', function (done) {
    const testJob = {
      host: 'http://10.0.0.02:4242',
      githubId: '11111'
    }
    rabbitmq.publishDockExistsCheck.returns()

    OnDockUnhealthy(testJob).asCallback(function (err) {
      if (err) { done(err) }
      sinon.assert.calledOnce(rabbitmq.publishDockExistsCheck)
      sinon.assert.calledWith(rabbitmq.publishDockExistsCheck, testJob)
      done()
    })
  })

  it('should WorkerStopError if missing host', function (done) {
    const testJob = {
      githubId: '11111'
    }

    OnDockUnhealthy(testJob).asCallback(function (err) {
      expect(err).instanceOf(WorkerStopError)
      expect(err.data.validationError.message).to.include('"host" is required')
      sinon.assert.notCalled(rabbitmq.publishDockExistsCheck)
      done()
    })
  })

  it('should WorkerStopError if missing githubId', function (done) {
    const testJob = {
      host: 'http://10.0.0.02:4242'
    }

    OnDockUnhealthy(testJob).asCallback(function (err) {
      expect(err).instanceOf(WorkerStopError)
      expect(err.data.validationError.message).to.include('"githubId" is required')
      sinon.assert.notCalled(rabbitmq.publishDockExistsCheck)
      done()
    })
  })
})
