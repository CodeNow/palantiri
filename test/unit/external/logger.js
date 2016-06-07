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

describe('logger.js unit test', function () {
  beforeEach(function (done) {
    // delete to ensure test runs
    delete require.cache[require.resolve('../../../lib/external/logger.js')]
    done()
  })

  describe('loading', function () {
    beforeEach(function (done) {
      process.env.LOGGLY_TOKEN = 'testtoken'
      done()
    })

    afterEach(function (done) {
      delete process.env.LOGGLY_TOKEN
      done()
    })

    it('should create logger', function (done) {
      var log = require('../../../lib/external/logger.js')(__filename)
      expect(log.trace).to.exist()
      expect(log.info).to.exist()
      expect(log.error).to.exist()
      expect(log.fatal).to.exist()
      done()
    })
  }) // end createContainer
})
