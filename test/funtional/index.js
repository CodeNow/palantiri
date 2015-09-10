'use strict';
require('loadenv')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var expect = Code.expect;

var sinon = require('sinon');
var Dockerode = require('dockerode');
var request = require('requestretry');

var rabbitClient = require('../../lib/external/rabbitmq.js');
var App = require('../../lib/app.js');

describe('functional test', function () {
  var app;
  var dockerStub;

  beforeEach(function(done) {
    process.env.COLLECT_INTERVAL = 100000;
    process.env.RSS_LIMIT = 2000;
    dockerStub = {
      start: sinon.stub().yieldsAsync(),
      remove: sinon.stub().yieldsAsync(),
      logs: sinon.stub(),
    };
    sinon.stub(Dockerode.prototype, 'createContainer')
      .yieldsAsync(null, dockerStub);
    sinon.stub(request.Request, 'request');
    app = new App();
    app.start(done);
  });

  afterEach(function(done) {
    delete process.env.COLLECT_INTERVAL;
    delete process.env.RSS_LIMIT;
    request.Request.request.restore();
    Dockerode.prototype.createContainer.restore();
    app.stop(done);
  });

  it('should run health check for docks', function (done) {
    var fakeStream = {
      on: function (e, cb) {
        if (e === 'data') {
          cb(JSON.stringify({ info: { VmRSS: '1234 kb' } }));
        } else if (e === 'end') {
          cb();
        }
      }
    };
    dockerStub.logs.yieldsAsync(null, fakeStream);

    request.Request.request.yieldsAsync(null, null, JSON.stringify([{
      host: 'http://localhost:4242',
      tags: 'build,run,1111'
    }]));
    var interval = setInterval(function () {
      if (dockerStub.remove.called) {
        clearInterval(interval);
        done();
      }
    }, 15);
  });

  it('should emit unhealthy event if dock unhealthy', function (done) {
    var testHost = 'http://localhost:4242';
    var fakeStream = {
      on: function (e, cb) {
        if (e === 'data') {
          cb(JSON.stringify({ info: { VmRSS: '9999 kb' } }));
        } else if (e === 'end') {
          cb();
        }
      }
    };
    dockerStub.logs.yieldsAsync(null, fakeStream);

    request.Request.request.yieldsAsync(null, null, JSON.stringify([{
      host: testHost,
      tags: 'build,run,1111'
    }]));

    rabbitClient.hermesClient.subscribe('on-dock-unhealthy', function (data, cb) {
      cb();
      expect(data.host).to.equal(testHost);
      expect(data.githubId).to.equal(1111);
      var interval = setInterval(function () {
        if (dockerStub.remove.called) {
          clearInterval(interval);
          done();
        }
      }, 15);
    });
  });
});