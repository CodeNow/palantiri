'use strict'
require('loadenv')()

const keypather = require('keypather')()
const SwarmClient = require('@runnable/loki').Swarm
const logger = require('./logger')()

module.exports = class Swarm extends SwarmClient {
  /**
   * creates swarm class
   * @param  {String} host docker host format: 10.0.0.0:4242
   * @return {Docker}      Docker instance
   */
  constructor () {
    const dockerHost = 'https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT
    super({ host: dockerHost, log: logger.child({ module: 'Swarm' }) })
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
    const log = logger.child({ method: 'getHostsWithOrgs', module: 'Swarm' })
    log.info('getHostsWithOrgs call')
    return this.swarmInfoAsync()
      .then((info) => {
        log.trace({ info: info }, 'getHostsWithOrgs - got info')
        const nodes = info.parsedSystemStatus.ParsedNodes
        return Object.keys(nodes).map((k) => {
          const node = nodes[k]
          return {
            host: 'http://' + node.Host,
            org: keypather.get(node, 'Labels.org.toString()')
          }
        })
      })
  }
}
