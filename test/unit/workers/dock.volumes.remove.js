'use strict'
require('loadenv')()
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const Docker = require('../../../lib/external/docker.js')
const rabbitmq = require('../../../lib/external/rabbitmq.js')
const Worker = require('../../../lib/workers/dock.volumes.remove.js').task

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
    sinon.stub(Docker.prototype, 'listDanglingVolumes')
    sinon.stub(rabbitmq, 'publishTask')
    done()
  })

  afterEach(done => {
    Docker.prototype.listDanglingVolumes.restore()
    rabbitmq.publishTask.restore()
    done()
  })

  describe('volumes', () => {
    it('should publish a job for each dangling volume returned', done => {
      const volume = { name: 'asdasdas' }
      Docker.prototype.listDanglingVolumes.resolves({ Volumes: [volume] })

      Worker(testJob).asCallback(err => {
        if (err) { return done(err) }
        sinon.assert.calledOnce(rabbitmq.publishTask)
        sinon.assert.calledWith(
          rabbitmq.publishTask,
          'dock.volume.remove',
          { volume, host: testJob.host }
        )
        done()
      })
    })
  })
})
