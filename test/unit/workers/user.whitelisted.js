'use strict'

require('loadenv')({ debugName: 'khronos:test' })

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach

const sinon = require('sinon')

const rabbitmq = require('../../../lib/external/rabbitmq')

// internal (being tested)
const UserWhitelisted = require('../../../lib/workers/user-whitelisted').task

require('sinon-as-promised')(require('bluebird'))

describe('User Whitelisted Task', function () {
  describe('Successful runs', function () {
    var org = 13801594
    beforeEach(function (done) {
      sinon.stub(rabbitmq, 'publishASGCheckCreated').returns()
      done()
    })
    afterEach(function (done) {
      rabbitmq.publishASGCheckCreated.restore()
      done()
    })

    it('should resolve successfully', function () {
      let job = {
        createdAt: Math.floor(new Date().getTime() / 1000) - 101,
        githubId: org,
        orgName: 'asdasdasd'
      }
      return UserWhitelisted(job)
        .then(function () {
          sinon.assert.calledOnce(rabbitmq.publishASGCheckCreated)
          sinon.assert.calledWithExactly(
            rabbitmq.publishASGCheckCreated,
            job
          )
        })
    })
  })
})
