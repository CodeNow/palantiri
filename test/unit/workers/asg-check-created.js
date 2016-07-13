'use strict'

require('loadenv')({ debugName: 'khronos:test' })

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
const TaskError = require('ponos').TaskError
const TaskFatalError = require('ponos').TaskFatalError

// internal (being tested)
const CheckASGWasCreated = require('../../../lib/workers/asg-check-created')

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

  describe('Joi validation', function () {
    it('should fail if empty', function (done) {
      return assert.isRejected(CheckASGWasCreated())
        .then(function (err) {
          assert.instanceOf(err, TaskFatalError)
          assert.include(err.message, 'Invalid Job')
        })
    })
    it('should fail missing createdAt', function (done) {
      return assert.isRejected(CheckASGWasCreated({
        githubId: 123213,
        orgName: 'asdasdasd'
      }))
        .then(function (err) {
          assert.instanceOf(err, TaskFatalError)
          assert.include(err.message, 'Invalid Job')
        })
    })
    it('should fail missing githubId', function (done) {
      return assert.isRejected(CheckASGWasCreated({
        createdAt: Math.floor(new Date().getTime() / 1000),
        orgName: 'asdasdasd'
      }))
        .then(function (err) {
          assert.instanceOf(err, TaskFatalError)
          assert.include(err.message, 'Invalid Job')
        })
    })
    it('should fail missing orgName', function (done) {
      return assert.isRejected(CheckASGWasCreated({
        createdAt: Math.floor(new Date().getTime() / 1000),
        githubId: 123213
      }))
        .then(function (err) {
          assert.instanceOf(err, TaskFatalError)
          assert.include(err.message, 'Invalid Job')
        })
    })
  })
  describe('testing the delay', function () {
    process.env.CHECK_ASG_CREATED_DELAY_IN_SEC = 100
    it('should throw TaskError when not enough time has passed ', function (done) {
      return assert.isRejected(CheckASGWasCreated({
        createdAt: Math.floor(new Date().getTime() / 1000) + 100,
        githubId: 1232132,
        orgName: 'asdasdasd'
      }))
        .then(function (err) {
          assert.instanceOf(err, TaskError)
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

    it('should resolve successfully', function (done) {
      return CheckASGWasCreated({
        createdAt: Math.floor(new Date().getTime() / 1000) - 101,
        githubId: orgWithDock,
        orgName: 'asdasdasd'
      })
    })
    it('should fire off a datadog when the org doesn\'t have a dock!', function (done) {
      return assert.isRejected(CheckASGWasCreated({
        createdAt: Math.floor(new Date().getTime() / 1000) - 101,
        githubId: orgWithoutDock,
        orgName: 'asdasdasd'
      }))
        .then(function (err) {
          assert.instanceOf(err, TaskError)
          sinon.assert.calledOnce(monitor.event)
        })
    })
  })
})
