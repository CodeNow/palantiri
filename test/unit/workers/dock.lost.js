'use strict'

require('loadenv')()

const ErrorCat = require('error-cat')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const DockLost = require('../../../lib/workers/dock.lost').task
const rabbitmq = require('../../../lib/external/rabbitmq')

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const it = lab.it

describe('dock.lost unit test', function () {
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
      host: 'http://10.0.0.02:4242'
    }
    rabbitmq.publishDockExistsCheck.returns()

    DockLost(testJob).asCallback(function (err) {
      if (err) { done(err) }
      sinon.assert.calledOnce(rabbitmq.publishDockExistsCheck)
      sinon.assert.calledWith(rabbitmq.publishDockExistsCheck, testJob)
      done()
    })
  })
})
