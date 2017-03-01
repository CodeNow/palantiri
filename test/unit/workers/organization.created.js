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
const OrganizationCreated = require('../../../lib/workers/organization.created').task

require('sinon-as-promised')(require('bluebird'))

describe('User Whitelisted Task', function () {
  describe('Successful runs', function () {
    var org = 13801594

    beforeEach(function (done) {
      sinon.stub(rabbitmq, 'publishTask').returns()
      done()
    })
    afterEach(function (done) {
      rabbitmq.publishTask.restore()
      done()
    })

    it('should resolve successfully', function () {
      let job = {
        createdAt: Math.floor(new Date().getTime() / 1000) - 101,
        organization: {
          githubId: org,
          orgName: 'asdasdasd'
        }
      }
      return OrganizationCreated(job)
      .then(function () {
        sinon.assert.calledOnce(rabbitmq.publishTask)
        sinon.assert.calledWithExactly(
          rabbitmq.publishTask,
          'asg.check-created',
          job
        )
      })
    })

    it('should not call publish if personal account', function () {
      let job = {
        createdAt: Math.floor(new Date().getTime() / 1000) - 101,
        organization: {
          githubId: org,
          orgName: 'asdasdasd',
          isPersonalAccount: true
        }
      }
      return OrganizationCreated(job)
      .then(function () {
        sinon.assert.notCalled(rabbitmq.publishTask)
      })
    })
  })
})
