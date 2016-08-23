'use strict'
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const keypather = require('keypather')()

const logger = require('../../external/logger')()
const Swarm = require('../../external/swarm')

module.exports = class Helpers {
  static ensureDockExists (host) {
    const log = logger.child({
      module: 'ensureDockExists',
      host: host
    })
    const swarm = new Swarm()
    return swarm.swarmHostExistsAsync(host)
      .then((doesExist) => {
        if (!doesExist) {
          log.trace('dock does not exist')
          throw new WorkerStopError('dock does not exist', {
            host: host
          })
        }
      })
  }

  static handleDockerError (err) {
    const code = keypather.get(err, 'statusCode')
    if (code === 404) {
      throw new WorkerStopError('does not exist', {
        err: err
      })
    }
  }
}
