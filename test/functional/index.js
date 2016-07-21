'use strict'
require('loadenv')()

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var Code = require('code')
var expect = Code.expect
var ErrorCat = require('error-cat')

const CriticalError = require('error-cat/errors/critical-error')
var sinon = require('sinon')
var Promise = require('bluebird')
require('sinon-as-promised')(Promise)
var swarm = require('../../lib/external/swarm')
const ponos = require('ponos')
var App = require('../../lib/app.js')
var Docker = require('../../lib/external/docker.js')

describe('functional test', function () {
  var app
  var server

  beforeEach(function (done) {
    process.env.COLLECT_INTERVAL = 100000
    process.env.RSS_LIMIT = 2000
    sinon.stub(Docker.prototype, 'createContainer').resolves({})
    sinon.stub(Docker.prototype, 'startContainer').resolves()
    sinon.stub(Docker.prototype, 'removeContainer').resolves()
    sinon.stub(Docker.prototype, 'containerLogs').resolves(JSON.stringify({ info: { VmRSS: '1234 kb' } }))
    sinon.stub(ErrorCat, 'report')
    sinon.stub(Docker.prototype, 'pullImage').resolves(null)
    sinon.stub(swarm.prototype, 'getNodes')
    app = new App()
    done()
  })

  afterEach(function (done) {
    delete process.env.COLLECT_INTERVAL
    delete process.env.RSS_LIMIT
    swarm.prototype.getNodes.restore()
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
      app.start(done)
    })
    afterEach(function (done) {
      app.stop(done)
    })
    it('should run health check for docks', function (done) {
      swarm.prototype.getNodes.resolves([{
        Host: 'localhost:4242',
        Labels: {
          org: '1111'
        }
      }])
      var interval = setInterval(function () {
        if (Docker.prototype.removeContainer.called) {
          clearInterval(interval)
          done()
        }
      }, 15)
    })
  })

  describe('dock unhealthy', function () {
    afterEach(function (done) {
      app.stop(function (err) {
        if (err) {
          return done()
        }
        return server.stop().asCallback(done)
      })
    })
    it('should emit unhealthy event if dock unhealthy', function (done) {
      process.env.RSS_LIMIT = 1
      var testHost = 'https://localhost:4242'
      swarm.prototype.getNodes.resolves([{
        Host: 'localhost:4242',
        Labels: {
          org: '1111'
        }
      }])
      server = new ponos.Server({
        tasks: {
          'on-dock-unhealthy': (job) => {
            expect(job.host).to.equal(testHost)
            expect(job.githubId).to.equal(1111)
            var interval = setInterval(function () {
              if (Docker.prototype.removeContainer.called) {
                clearInterval(interval)
                done()
              }
            }, 15)
            return Promise.resolve(job)
          }
        }
      })
      server.start().then(function () {
        app.start()
      })
    })
  })
})

describe('Unhealthy Test', function () {
  var app
  var server
  beforeEach(function (done) {
    process.env.COLLECT_INTERVAL = 100000
    process.env.RSS_LIMIT = 2000
    sinon.stub(Docker.prototype, 'createContainer').resolves({})
    sinon.stub(Docker.prototype, 'startContainer').resolves(null)
    sinon.stub(Docker.prototype, 'containerLogs').rejects(new CriticalError('Error response from daemon: Untar error on re-exec cmd: fork/exec /proc/self/exe: cannot allocate memory'))
    sinon.stub(ErrorCat, 'report')
    sinon.stub(Docker.prototype, 'pullImage').resolves(null)
    sinon.stub(swarm.prototype, 'getNodes')
    app = new App()
    app.start(done)
  })

  afterEach(function (done) {
    delete process.env.COLLECT_INTERVAL
    delete process.env.RSS_LIMIT
    swarm.prototype.getNodes.restore()
    Docker.prototype.createContainer.restore()
    Docker.prototype.startContainer.restore()
    Docker.prototype.containerLogs.restore()
    Docker.prototype.pullImage.restore()
    ErrorCat.report.restore()
    app.stop(function (err) {
      if (err) {
        return done()
      }
      server.stop().asCallback(done)
    })
  })
  it('should emit unhealthy if start fails with out of memory error', function (done) {
    server = new ponos.Server({
      tasks: {
        'on-dock-unhealthy': (job) => {
          expect(job.host).to.equal(testHost)
          expect(job.githubId).to.equal(1111)
          Promise.resolve(job)
          done()
        }
      }
    })
    server.start()
    process.env.RSS_LIMIT = 1
    var testHost = 'https://localhost:4242'

    swarm.prototype.getNodes.resolves([{
      Host: 'localhost:4242',
      Labels: {
        org: '1111'
      }
    }])
  })
})
