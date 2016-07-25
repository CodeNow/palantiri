'use strict'

require('loadenv')()

const Promise = require('bluebird')
const Code = require('code')
const Lab = require('lab')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const SwarmClient = require('@runnable/loki').Swarm

const Swarm = require('../../../lib/external/swarm')

const lab = exports.lab = Lab.script()

const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.experiment
const expect = Code.expect
const it = lab.test

describe('swarm unit test', () => {
  let docker
  const testHost = '10.0.0.1:4242'

  beforeEach((done) => {
    docker = new Swarm(testHost)
    done()
  })

  describe('getHostsWithOrgs', function () {
    beforeEach(function (done) {
      const info = {
        parsedSystemStatus: {
          ParsedNodes: [
            {
              Host: '127.0.0.1:4242',
              Labels: {
                org: 27081
              }
            }
          ]
        }
      }
      sinon.stub(SwarmClient.prototype, 'swarmInfoAsync').resolves(info)
      done()
    })

    afterEach(function (done) {
      SwarmClient.prototype.swarmInfoAsync.restore()
      done()
    })

    it('should fail if swarmInfoAsync failed', function (done) {
      SwarmClient.prototype.swarmInfoAsync.rejects(new Error('Swarm error'))
      docker.getHostsWithOrgs()
      .then(function () {
        return done(new Error('Should never happen'))
      })
      .catch(function (err) {
        expect(err.message).to.equal('Swarm error')
        sinon.assert.calledOnce(SwarmClient.prototype.swarmInfoAsync)
        done()
      })
    })

    it('should succeed if swarmInfoAsync succeeded', function (done) {
      docker.getHostsWithOrgs()
      .tap(function (hosts) {
        sinon.assert.calledOnce(SwarmClient.prototype.swarmInfoAsync)
        expect(hosts.length).to.equal(1)
        expect(hosts[0].host).to.equal('http://127.0.0.1:4242')
        expect(hosts[0].org).to.equal('27081')
      })
      .asCallback(done)
    })
  })
})
