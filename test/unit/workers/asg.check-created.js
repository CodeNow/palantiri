'use strict'

require('loadenv')({ debugName: 'palantiri:test' })

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach

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
        createdAt: Math.floor(new Date().getTime() / 1000) + 100,
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
    var orgWithDock = 13801594
    var orgWithoutDock = 21312321
    var rawDock = [{
      host: 'http://localhost:5454',
      org: orgWithDock.toString()
    }]
    beforeEach(function (done) {
      Swarm.prototype.getHostsWithOrgs.resolves(rawDock)
      done()
    })

    it('should resolve successfully', function () {
      return CheckASGWasCreated({
        createdAt: Math.floor(new Date().getTime() / 1000) - 101,
        organization: {
          githubId: orgWithDock,
          orgName: 'asdasdasd'
        }
      })
    })
    it('should fire off a datadog when the org doesn\'t have a dock!', function () {
      return assert.isRejected(CheckASGWasCreated({
        createdAt: Math.floor(new Date().getTime() / 1000) - 101,
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
