'use strict'
require('loadenv')()
const cls = require('continuation-local-storage').createNamespace('ponos')
const Code = require('code')
const Lab = require('lab')

const lab = exports.lab = Lab.script()

const describe = lab.describe
const expect = Code.expect
const it = lab.it

const logger = require('../../../lib/external/logger.js')

describe('logger.js unit test', function () {
  describe('loading', function () {
    it('should create logger', function (done) {
      const log = logger()
      expect(log.trace).to.exist()
      expect(log.info).to.exist()
      expect(log.error).to.exist()
      expect(log.fatal).to.exist()
      done()
    })

    it('should add props to logger', function (done) {
      const log = logger({test: 'prop'})
      expect(log.fields.test).to.equal('prop')
      done()
    })
  }) // end loading
  describe('serializers', function () {
    const serializers = logger().serializers
    it('should use ponos namespace', function (done) {
      const testId = 'blue is good'
      cls.run(() => {
        cls.set('tid', testId)
        const out = serializers.tx()
        expect(out.tid).to.equal(testId)
        done()
      })
    })

    it('should not error if no namespace', function (done) {
      const out = serializers.tx()
      expect(out).to.be.undefined()
      done()
    })
  }) // end serializers
})
