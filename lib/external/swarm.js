'use strict'
require('loadenv')()

const Promise = require('bluebird')
const SwarmClient = require('@runnable/loki').Swarm
const log = require('./logger')()

module.exports = class Swarm extends SwarmClient {
  /**
   * creates swarm class
   * @param  {String} host docker host format: 10.0.0.0:4242
   * @return {Docker}      Docker instance
   */
  constructor () {
    const dockerHost = 'https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT
    super({ host: dockerHost, log: log })
  }

  /**
   * get array of nodes
   * @return {Promise}
   * @resolves {Object[]} array of nodes
   */
  getNodes () {
    log.info('Swarm.prototype.getNodes')
    return this.swarmInfoAsync()
      .then((info) => {
        log.trace({ info: info }, 'getNodes - got nodes')
        const nodes = info.parsedSystemStatus.ParsedNodes
        return Promise.map(Object.keys(nodes), (key) => {
          return nodes[key]
        })
      })
  }

  /**
   * Get the swarm hosts with the org attached to them.
   * @return {Promise} Resolves with an array of objects of the form:
   *   {
   *     host: 'http://ip.addr:port',
   *     org: 'orgidasastring'
   *   }
   */
  getHostsWithOrgs () {
    const log = log.child({
      module: 'Swarm',
      method: 'getHostsWithOrgs'
    })
    log.info('call')
    return this.swarmInfoAsync()
      .then((info) => {
        return Object.keys(info.parsedSystemStatus.ParsedNodes).map((k) => {
          const d = info.parsedSystemStatus.ParsedNodes[k]
          return {
            host: 'http://' + d.host,
            org: d.Labels.org.toString()
          }
        })
      })
  }
}
