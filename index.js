/**
 * starts palantiri
 * @module index
 */

'use strict'

var App = require('./lib/app.js')
var ErrorCat = require('error-cat')
var error = new ErrorCat()
var log = require('./lib/external/logger.js')()

var app = new App()
app.start(function (err) {
  if (err) {
    error.wrap(err, 500, 'app exited')
  }
  log.fatal(err, 'app exited')
})
