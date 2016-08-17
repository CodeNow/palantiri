/**
 * starts palantiri
 * @module index
 */

'use strict'

const App = require('./lib/app.js')
const CriticalError = require('error-cat/errors/critical-error')
const ErrorCat = require('error-cat')
const log = require('./lib/external/logger.js')()

const app = new App()
app.start()
  .catch((err) => {
    ErrorCat.report(new CriticalError(
      'server failed to start',
      { err: err }
    ))
    log.fatal(err, 'app exited')
  })
