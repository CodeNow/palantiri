'use strict'
require('loadenv')()
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const Helpers = require('../../../lib/workers/shared/helpers.js')
const rabbitmq = require('../../../lib/external/rabbitmq.js')
const Worker = require('../../../lib/workers/dock.disk.filled.js').task

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const it = lab.it

describe('dock.disk.filled.js unit test', () => {
  const testJob = {
    host: '10.0.0.2:4242'
  }

  beforeEach(done => {
    sinon.stub(Helpers, 'ensureDockExists').resolves()
    sinon.stub(rabbitmq, 'publishTask')
    done()
  })

  afterEach(done => {
    Helpers.ensureDockExists.restore()
    rabbitmq.publishTask.restore()
    done()
  })
  describe('images', () => {
    beforeEach(done => {
      done()
    })

    it('should publish cleanup tasks', done => {
      Worker(testJob).asCallback(err => {
        if (err) { return done(err) }
        sinon.assert.calledTwice(rabbitmq.publishTask)
        sinon.assert.calledWith(rabbitmq.publishTask, 'dock.images.remove', testJob)
        sinon.assert.calledWith(rabbitmq.publishTask, 'dock.volumes.remove', testJob)
        done()
      })
    })
  })
})
