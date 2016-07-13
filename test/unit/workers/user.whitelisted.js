'use strict'

require('loadenv')({ debugName: 'khronos:test' })

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach

const sinon = require('sinon')
const chai = require('chai')

const TaskFatalError = require('ponos').TaskFatalError
const rabbitmq = require('../../../lib/external/rabbitmq')

// internal (being tested)
const UserWhitelisted = require('../../../lib/workers/user-whitelisted')

const assert = chai.assert
chai.use(require('chai-as-promised'))
require('sinon-as-promised')(require('bluebird'))

describe('User Whitelisted Task', function () {
  describe('Joi validation', function () {
    it('should fail if empty', function (done) {
      return assert.isRejected(UserWhitelisted())
        .then(function (err) {
          assert.instanceOf(err, TaskFatalError)
          assert.include(err.message, 'Invalid Job')
        })
    })
    it('should fail missing createdAt', function (done) {
      return assert.isRejected(UserWhitelisted({
        githubId: 123213,
        orgName: 'asdasdasd'
      }))
        .then(function (err) {
          assert.instanceOf(err, TaskFatalError)
          assert.include(err.message, 'Invalid Job')
        })
    })
    it('should fail missing githubId', function (done) {
      return assert.isRejected(UserWhitelisted({
        createdAt: Math.floor(new Date().getTime() / 1000),
        orgName: 'asdasdasd'
      }))
        .then(function (err) {
          assert.instanceOf(err, TaskFatalError)
          assert.include(err.message, 'Invalid Job')
        })
    })
    it('should fail missing orgName', function (done) {
      return assert.isRejected(UserWhitelisted({
        createdAt: Math.floor(new Date().getTime() / 1000),
        githubId: 123213
      }))
        .then(function (err) {
          assert.instanceOf(err, TaskFatalError)
          assert.include(err.message, 'Invalid Job')
        })
    })
  })

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

    it('should resolve successfully', function (done) {
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
