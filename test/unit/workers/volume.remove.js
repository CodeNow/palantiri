'use strict'
require('loadenv')()
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const Docker = require('../../../lib/external/docker.js')
const Helpers = require('../../../lib/workers/shared/helpers.js')
const Worker = require('../../../lib/workers/volume.remove.js').task

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const it = lab.it

describe('volume.remove unit test', () => {
  const testJob = {
    volume: { name: 'asdasdsada' },
    host: '10.0.0.2:4242'
  }

  beforeEach((done) => {
    sinon.stub(Docker.prototype, 'removeVolume').resolves()
    sinon.stub(Helpers, 'ensureDockExists').resolves()
    sinon.stub(Helpers, 'handleDockerError').resolves()
    done()
  })

  afterEach((done) => {
    Docker.prototype.removeVolume.restore()
    Helpers.ensureDockExists.restore()
    Helpers.handleDockerError.restore()
    done()
  })

  it('should call delete volume with the volume.name', () => {
    return Worker(testJob)
      .then(() => {
        sinon.assert.calledWith(Docker.prototype.removeVolume, testJob.volume.name)
      })
  })
})
