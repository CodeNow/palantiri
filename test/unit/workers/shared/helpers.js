'use strict'
require('loadenv')()
const Code = require('code')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const Helpers = require('../../../../lib/workers/shared/helpers')
const Swarm = require('../../../../lib/external/swarm')

require('sinon-as-promised')(Promise)
const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = Code.expect
const it = lab.it

describe('helpers unit test', function () {
  const testHost = '10.2.2.2:1738'

  beforeEach(function (done) {
    sinon.stub(Swarm.prototype, 'swarmHostExistsAsync')
    done()
  })

  afterEach(function (done) {
    Swarm.prototype.swarmHostExistsAsync.restore()
    done()
  })

  describe('ensureDockExists', function () {
    it('should not throw if dock exists', function () {
      Swarm.prototype.swarmHostExistsAsync.resolves(true)
      return Helpers.ensureDockExists(testHost)
        .then(() => {
          sinon.assert.calledOnce(Swarm.prototype.swarmHostExistsAsync)
          sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, testHost)
        })
    })

    it('should throw Worker Stop if dock does not exist', function () {
      Swarm.prototype.swarmHostExistsAsync.resolves(false)
      return Helpers.ensureDockExists(testHost)
        .catch(WorkerStopError, (err) => {
          expect(err.message).to.contain('dock does not exist')
        })
    })
  }) // end ensureDockExists

  describe('handleDockerError', function () {
    it('should throw WorkerStopError if 404', function (done) {
      expect(() => {
        Helpers.handleDockerError({statusCode: 404})
      }).to.throw(WorkerStopError, 'does not exist')
      done()
    })

    it('should throw WorkerStopError if 409', function (done) {
      expect(() => {
        Helpers.handleDockerError({statusCode: 409})
      }).to.throw(WorkerStopError, 'image still in use')
      done()
    })

    it('should throw original error', function (done) {
      const testError = new Error('Red River')
      expect(() => {
        Helpers.handleDockerError(testError)
      }).to.throw(Error, testError)
      done()
    })
  }) // end handleDockerError
}) // end helpers unit test
