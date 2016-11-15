'use strict'

require('loadenv')({ debugName: 'palantiri:test' })

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach

// external
const chai = require('chai')
const monitor = require('monitor-dog')
const sinon = require('sinon')

// Internal
const Swarm = require('../../../lib/external/swarm')
const WorkerError = require('error-cat/errors/worker-error')

// internal (being tested)
const CheckASGWasCreated = require('../../../lib/workers/asg.check-created').task

const assert = chai.assert
chai.use(require('chai-as-promised'))
require('sinon-as-promised')(require('bluebird'))

describe('ASG Check Created Task', function () {
  beforeEach(function (done) {
    sinon.stub(Swarm.prototype, 'getHostsWithOrgs')
    sinon.stub(monitor, 'event')
    done()
  })
  afterEach(function (done) {
    Swarm.prototype.getHostsWithOrgs.restore()
    monitor.event.restore()
    done()
  })

  describe('testing the delay', function () {
    process.env.CHECK_ASG_CREATED_DELAY_IN_SEC = 100
    it('should throw WorkerError when not enough time has passed ', function () {
      return assert.isRejected(CheckASGWasCreated({
        createdAt: new Date().getTime() + 100000,
        organization: {
          githubId: 1232132,
          orgName: 'asdasdasd'
        }
      }))
        .then(function (err) {
          assert.instanceOf(err, WorkerError)
          assert.include(err.message, 'still needs to wait')
        })
    })
  })

  describe('Successful runs', function () {
    process.env.CHECK_ASG_CREATED_DELAY_IN_SEC = 100
    const orgWithDock = 13801594
    const orgWithoutDock = 21312321
    const rawDock = [{
      host: 'http://localhost:5454',
      org: orgWithDock.toString()
    }]
    beforeEach(function (done) {
      Swarm.prototype.getHostsWithOrgs.resolves(rawDock)
      done()
    })

    it('should resolve successfully', function () {
      return CheckASGWasCreated({
        createdAt: new Date().getTime() - 101000,
        organization: {
          githubId: orgWithDock,
          orgName: 'asdasdasd'
        }
      })
    })

    it('should fire off a datadog when the org doesn\'t have a dock!', function () {
      return assert.isRejected(CheckASGWasCreated({
        createdAt: new Date().getTime() - 101000,
        organization: {
          githubId: orgWithoutDock,
          orgName: 'asdasdasd'
        }
      }))
        .then(function (err) {
          assert.instanceOf(err, WorkerError)
          sinon.assert.calledOnce(monitor.event)
        })
    })
  })
})
