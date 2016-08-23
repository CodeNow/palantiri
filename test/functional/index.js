'use strict'
require('loadenv')()

const Code = require('code')
const CriticalError = require('error-cat/errors/critical-error')
const ErrorCat = require('error-cat')
const Lab = require('lab')
const Promise = require('bluebird')
const sinon = require('sinon')

const App = require('../../lib/app.js')
const Docker = require('../../lib/external/docker.js')
const rabbitmq = require('../../lib/external/rabbitmq')
const swarm = require('../../lib/external/swarm')

const lab = exports.lab = Lab.script()
require('sinon-as-promised')(Promise)

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = Code.expect
const it = lab.it

describe('functional test', function () {
  var app

  beforeEach(function (done) {
    process.env.COLLECT_INTERVAL = 100000
    process.env.RSS_LIMIT = 2000
    sinon.stub(Docker.prototype, 'createContainer').resolves({})
    sinon.stub(Docker.prototype, 'startContainer').resolves()
    sinon.stub(Docker.prototype, 'removeContainer').resolves()
    sinon.stub(Docker.prototype, 'containerLogs').resolves(JSON.stringify({ info: { VmRSS: '1234 kb' } }))
    sinon.stub(ErrorCat, 'report')
    sinon.stub(Docker.prototype, 'pullImage').resolves(null)
    sinon.stub(swarm.prototype, 'getHostsWithOrgs')
    app = new App()
    done()
  })

  afterEach(function (done) {
    delete process.env.COLLECT_INTERVAL
    delete process.env.RSS_LIMIT
    swarm.prototype.getHostsWithOrgs.restore()
    Docker.prototype.createContainer.restore()
    Docker.prototype.startContainer.restore()
    Docker.prototype.removeContainer.restore()
    Docker.prototype.containerLogs.restore()
    Docker.prototype.pullImage.restore()
    ErrorCat.report.restore()
    done()
  })

  describe('health check', function () {
    beforeEach(function (done) {
      app.start().asCallback(done)
    })
    afterEach(function (done) {
      app.stop().asCallback(done)
    })
    it('should run health check for docks', function (done) {
      swarm.prototype.getHostsWithOrgs.resolves([{
        host: 'http://localhost:4242',
        org: '1111'
      }])
      var interval = setInterval(function () {
        if (Docker.prototype.removeContainer.called) {
          clearInterval(interval)
          done()
        }
      }, 15)
    })
  })

  describe('dock lost', function () {
    let stub
    beforeEach(function (done) {
      sinon.stub(rabbitmq, 'publishDockLost', function (data) {
        stub(data)
      })
      done()
    })

    afterEach(function (done) {
      rabbitmq.publishDockLost.restore()
      app.stop().asCallback(done)
    })

    it('should emit `dock.lost` event if dock was lost', function (done) {
      process.env.RSS_LIMIT = 1
      const testHost = 'http://localhost:4242'
      swarm.prototype.getHostsWithOrgs.resolves([{
        host: 'http://localhost:4242',
        org: '1111'
      }])

      app.start().asCallback(function () {
        stub = (job) => {
          setTimeout(() => {
            expect(job.host).to.equal(testHost)
            done()
          }, 10)
        }
      })
    })
  })
})

describe('Unhealthy Test', function () {
  var app
  let stub

  beforeEach(function (done) {
    process.env.COLLECT_INTERVAL = 100000
    process.env.RSS_LIMIT = 2000
    sinon.stub(Docker.prototype, 'createContainer').resolves({})
    sinon.stub(Docker.prototype, 'startContainer').resolves(null)
    sinon.stub(Docker.prototype, 'containerLogs').rejects(new CriticalError('Error response from daemon: Untar error on re-exec cmd: fork/exec /proc/self/exe: cannot allocate memory'))
    sinon.stub(ErrorCat, 'report')
    sinon.stub(Docker.prototype, 'pullImage').resolves(null)
    sinon.stub(swarm.prototype, 'getHostsWithOrgs')
    sinon.stub(rabbitmq, 'publishDockLost', function (data) {
      stub(data)
    })
    app = new App()
    app.start().asCallback(done)
  })

  afterEach(function (done) {
    delete process.env.COLLECT_INTERVAL
    delete process.env.RSS_LIMIT
    swarm.prototype.getHostsWithOrgs.restore()
    Docker.prototype.createContainer.restore()
    Docker.prototype.startContainer.restore()
    Docker.prototype.containerLogs.restore()
    Docker.prototype.pullImage.restore()
    rabbitmq.publishDockLost.restore()
    ErrorCat.report.restore()
    app.stop().asCallback(done)
  })

  it('should emit unhealthy if start fails with out of memory error', function (done) {
    stub = (job) => {
      setTimeout(() => {
        expect(job.host).to.equal(testHost)
        done()
      }, 10)
    }
    process.env.RSS_LIMIT = 1
    const testHost = 'http://localhost:4242'

    swarm.prototype.getHostsWithOrgs.resolves([{
      host: 'http://localhost:4242',
      org: '1111'
    }])
  })
})
