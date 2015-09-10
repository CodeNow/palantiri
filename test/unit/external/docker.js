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
var str = require('string-to-stream');
var EventEmitter = require('events').EventEmitter;

var Docker = require('../../../lib/external/docker.js');

describe('docker.js unit test', function () {
  var testHost = 'http://localhost:4242';
  var docker;
  beforeEach(function (done) {
    process.env.DOCKER_RETRY_ATTEMPTS = 2;
    process.env.DOCKER_RETRY_INTERVAL = 1;
    docker = new Docker(testHost);
    done();
  });

  afterEach(function (done) {
    delete process.env.DOCKER_RETRY_ATTEMPTS;
    delete process.env.DOCKER_RETRY_INTERVAL;
    done();
  });

  describe('createContainer', function () {
    beforeEach(function (done) {
      sinon.stub(docker.client, 'createContainer');
      done();
    });

    afterEach(function (done) {
      docker.client.createContainer.restore();
      done();
    });

    it('should call createContainer', function (done) {
      var testRes = 'thisisatest';
      var testArgs = 'testArg';
      docker.client.createContainer.yieldsAsync(null, testRes);
      docker.createContainer(testArgs, function (err, res) {
        expect(err).to.not.exist();
        expect(res).to.equal(testRes);
        expect(docker.client.createContainer.withArgs(testArgs).calledOnce).to.be.true();
        done();
      });
    });

    it('should retry if failed', function (done) {
      var testRes = 'thisisatest';
      var testArgs = 'testArg';
      docker.client.createContainer.onCall(0).yieldsAsync('error');
      docker.client.createContainer.onCall(1).yieldsAsync(null, testRes);
      docker.createContainer(testArgs, function (err, res) {
        expect(err).to.not.exist();
        expect(res).to.equal(testRes);
        expect(docker.client.createContainer.withArgs(testArgs).calledTwice).to.be.true();
        done();
      });
    });

    it('should cb error if failed over retry count', function (done) {
      var testError = 'explode';
      var testArgs = 'testArg';
      docker.client.createContainer.onCall(0).yieldsAsync(testError);
      docker.client.createContainer.onCall(1).yieldsAsync(testError);
      docker.createContainer(testArgs, function (err) {
        expect(err).to.equal(testError);
        expect(docker.client.createContainer.withArgs(testArgs).calledTwice).to.be.true();
        done();
      });
    });
  }); // end createContainer

  describe('startContainer', function () {
    var containerMock;
    beforeEach(function (done) {
      containerMock = {
        start: sinon.stub()
      };
      done();
    });

    it('should call startContainer', function (done) {
      var testRes = 'thisisatest';
      containerMock.start.yieldsAsync(null, testRes);
      docker.startContainer(containerMock, function (err, res) {
        expect(err).to.not.exist();
        expect(res).to.equal(testRes);
        expect(containerMock.start.calledOnce).to.be.true();
        done();
      });
    });

    it('should retry if failed', function (done) {
      var testRes = 'thisisatest';
      containerMock.start.onCall(0).yieldsAsync('error');
      containerMock.start.onCall(1).yieldsAsync(null, testRes);
      docker.startContainer(containerMock, function (err, res) {
        expect(err).to.not.exist();
        expect(res).to.equal(testRes);
        expect(containerMock.start.calledTwice).to.be.true();
        done();
      });
    });

    it('should cb error if failed over retry count', function (done) {
      var testError = 'explode';
      containerMock.start.onCall(0).yieldsAsync(testError);
      containerMock.start.onCall(1).yieldsAsync(testError);
      docker.startContainer(containerMock, function (err) {
        expect(err).to.equal(testError);
        expect(containerMock.start.calledTwice).to.be.true();
        done();
      });
    });
  }); // end startContainer

  describe('removeContainer', function () {
    var containerMock;
    beforeEach(function (done) {
      containerMock = {
        remove: sinon.stub()
      };
      done();
    });

    it('should call removeContainer', function (done) {
      var testRes = 'thisisatest';
      containerMock.remove.yieldsAsync(null, testRes);
      docker.removeContainer(containerMock, function (err, res) {
        expect(err).to.not.exist();
        expect(res).to.equal(testRes);
        expect(containerMock.remove.calledOnce).to.be.true();
        done();
      });
    });

    it('should retry if failed', function (done) {
      var testRes = 'thisisatest';
      containerMock.remove.onCall(0).yieldsAsync('error');
      containerMock.remove.onCall(1).yieldsAsync(null, testRes);
      docker.removeContainer(containerMock, function (err, res) {
        expect(err).to.not.exist();
        expect(res).to.equal(testRes);
        expect(containerMock.remove.calledTwice).to.be.true();
        done();
      });
    });

    it('should cb error if failed over retry count', function (done) {
      var testError = 'explode';
      containerMock.remove.onCall(0).yieldsAsync(testError);
      containerMock.remove.onCall(1).yieldsAsync(testError);
      docker.removeContainer(containerMock, function (err) {
        expect(err).to.equal(testError);
        expect(containerMock.remove.calledTwice).to.be.true();
        done();
      });
    });
  }); // end removeContainer

  describe('containerLogs', function () {
    var containerMock;
    beforeEach(function (done) {
      containerMock = {
        logs: sinon.stub()
      };
      done();
    });

    it('should get logs', function (done) {
      var testLog = 'thisisatest';
      containerMock.logs.yieldsAsync(null, str(testLog));
      docker.containerLogs(containerMock, function (err, logs) {
        expect(err).to.not.exist();
        expect(logs).to.equal(testLog);
        expect(containerMock.logs.calledOnce).to.be.true();
        done();
      });
    });

    it('should cb error is stream error', function (done) {
      var testLogLog = 'thisisatest';
      var errorEmittor = new EventEmitter();
      process.env.DOCKER_RETRY_ATTEMPTS = 1;
      containerMock.logs.yields(null, errorEmittor);

      docker.containerLogs(containerMock, function (err) {
        expect(err).to.equal(testLogLog);
        expect(containerMock.logs.calledOnce).to.be.true();
        done();
      });

      errorEmittor.emit('error', testLogLog);
    });

    it('should retry if failed', function (done) {
      var testLog = 'thisisatest';
      containerMock.logs.onCall(0).yieldsAsync('error');
      containerMock.logs.onCall(1).yieldsAsync(null, str(testLog));
      docker.containerLogs(containerMock, function (err, logs) {
        expect(err).to.not.exist();
        expect(logs).to.equal(testLog);
        expect(containerMock.logs.calledTwice).to.be.true();
        done();
      });
    });

    it('should cb error if failed over retry count', function (done) {
      var testError = 'explode';
      containerMock.logs.onCall(0).yieldsAsync(testError);
      containerMock.logs.onCall(1).yieldsAsync(testError);
      docker.containerLogs(containerMock, function (err) {
        expect(err).to.equal(testError);
        expect(containerMock.logs.calledTwice).to.be.true();
        done();
      });
    });
  }); // end containerLogs
});