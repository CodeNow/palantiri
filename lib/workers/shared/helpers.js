'use strict'
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const keypather = require('keypather')()

const logger = require('../../external/logger')()
const Swarm = require('../../external/swarm')
const DockerUtils = require('@runnable/loki').Utils

module.exports = class Helpers {
  /**
   * ensures hosts exists in swarm, throws WorkerStopError if not
   * @param  {String} host host to check format: 10.0.0.0:4242
   * @return {Promise}
   * @resolves {undefined} If host exists in swarm
   * @throws {WorkerStopError} If host does not exist in swarm
   */
  static ensureDockExists (host) {
    const log = logger.child({
      module: 'ensureDockExists',
      host: host
    })
    const swarm = new Swarm()
    return swarm.swarmHostExistsAsync(DockerUtils.toDockerUrl(host))
      .then((doesExist) => {
        if (!doesExist) {
          log.trace('dock does not exist')
          throw new WorkerStopError('dock does not exist', {
            host: host
          })
        }
      })
  }

  /**
   * parses docker errors into worker errors
   * @param  {Error} err error object from dockerode
   * @return {undefined}
   * @throws {WorkerStopError} If code is 404
   * @throws {Error} If not 404 throw passed error
   */
  static handleDockerError (err) {
    const code = keypather.get(err, 'statusCode')
    if (code === 404) {
      throw new WorkerStopError('does not exist', {
        err: err
      })
    } else if (code === 409) {
      throw new WorkerStopError('image still in use', {
        err: err
      })
    }

    throw err
  }
}
