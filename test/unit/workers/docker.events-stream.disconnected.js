'use strict'

require('loadenv')()

const ErrorCat = require('error-cat')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const DockLost = require('../../../lib/workers/docker.events-stream.disconnected').task
const rabbitmq = require('../../../lib/external/rabbitmq')

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const it = lab.it

describe('docker.events-stream.disconnected unit test', function () {
  beforeEach(function (done) {
    sinon.stub(rabbitmq, 'publishEvent')
    sinon.stub(ErrorCat, 'report')
    done()
  })

  afterEach(function (done) {
    rabbitmq.publishEvent.restore()
    ErrorCat.report.restore()
    done()
  })

  it('should call publishEvent for host', function (done) {
    const testOrg = 11111
    const testJob = {
      host: 'http://10.0.0.02:4242',
      org: `${testOrg}`
    }
    rabbitmq.publishEvent.returns()

    DockLost(testJob).asCallback(function (err) {
      if (err) { done(err) }
      sinon.assert.calledOnce(rabbitmq.publishEvent)
      sinon.assert.calledWith(rabbitmq.publishEvent, 'dock.lost', {
        host: testJob.host,
        githubOrgId: testOrg
      })
      done()
    })
  })
})
