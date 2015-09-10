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
var clone = require('101/clone');

var DockerHealthCheck = require('../../../lib/workers/docker-health-check.js');
var rabbitmq = require('../../../lib/external/rabbitmq.js');
var monitorDog = require('monitor-dog');

describe('docker-health-check.js unit test', function () {
  var dockerHealthCheck;
  beforeEach(function (done) {
    dockerHealthCheck = new DockerHealthCheck();
    done();
  });

  describe('worker', function () {
    beforeEach(function (done) {
      sinon.stub(DockerHealthCheck.prototype, 'worker').yieldsAsync();
      done();
    });

    afterEach(function (done) {
      DockerHealthCheck.prototype.worker.restore();
      done();
    });

    it('should call worker', function (done) {
      var testData = {
        summon: 'Ramuh'
      };
      DockerHealthCheck.prototype.worker.yieldsAsync();

      DockerHealthCheck.worker(testData, function (err) {
        expect(DockerHealthCheck.prototype.worker.withArgs(testData).called)
          .to.be.true();
        expect(err).to.not.exist();

        done();
      });
    });
  }); // end worker

  describe('handle', function () {
    beforeEach(function (done) {
      sinon.stub(DockerHealthCheck.prototype, 'createInfoContainer');
      sinon.stub(DockerHealthCheck.prototype, 'startInfoContainer');
      sinon.stub(DockerHealthCheck.prototype, 'readInfoContainer');
      sinon.stub(DockerHealthCheck.prototype, 'reportData');
      sinon.stub(DockerHealthCheck.prototype, 'removeInfoContainer');

      done();
    });

    afterEach(function (done) {
      DockerHealthCheck.prototype.createInfoContainer.restore();
      DockerHealthCheck.prototype.startInfoContainer.restore();
      DockerHealthCheck.prototype.readInfoContainer.restore();
      DockerHealthCheck.prototype.reportData.restore();
      DockerHealthCheck.prototype.removeInfoContainer.restore();

      done();
    });

    it('should call handle', function (done) {
      var testData = {
        dockerHost: 'http://localhost:4242',
        githubId: 123215
      };
      DockerHealthCheck.prototype.createInfoContainer.yieldsAsync();
      DockerHealthCheck.prototype.startInfoContainer.yieldsAsync();
      DockerHealthCheck.prototype.readInfoContainer.yieldsAsync();
      DockerHealthCheck.prototype.reportData.yieldsAsync();
      DockerHealthCheck.prototype.removeInfoContainer.yieldsAsync();

      dockerHealthCheck.handle(testData, function (err) {
        expect(err).to.not.exist();
        expect(dockerHealthCheck.dockerClient).to.exist();
        expect(dockerHealthCheck.githubId)
          .to.equal(testData.githubId);

        done();
      });
    });

    it('should return error if one failed', function (done) {
      var testErr = 'meltdown';
      DockerHealthCheck.prototype.createInfoContainer.yieldsAsync();
      DockerHealthCheck.prototype.startInfoContainer.yieldsAsync();
      DockerHealthCheck.prototype.readInfoContainer.yieldsAsync(testErr);
      DockerHealthCheck.prototype.reportData.yieldsAsync();
      DockerHealthCheck.prototype.removeInfoContainer.yieldsAsync();

      dockerHealthCheck.handle({}, function (err) {
        expect(err).to.exist();

        done();
      });
    });
  }); // end handle

  describe('createInfoContainer', function () {
    beforeEach(function (done) {
      dockerHealthCheck.dockerClient = {
        createContainer: sinon.stub()
      };
      done();
    });

    it('should set container on good response', function (done) {
      var testContainer = 'Titan';
      dockerHealthCheck.dockerClient.createContainer
        .yieldsAsync(null, testContainer);

      dockerHealthCheck.createInfoContainer(function (err) {
        expect(err).to.not.exist();
        expect(dockerHealthCheck.container).to.equal(testContainer);

        done();
      });
    });

    it('should cb error', function (done) {
      var testError = 'ice sword';
      dockerHealthCheck.dockerClient.createContainer
        .yieldsAsync(testError);

      dockerHealthCheck.createInfoContainer(function (err) {
        expect(err).to.exist();

        done();
      });
    });
  }); // end createInfoContainer

  describe('startInfoContainer', function () {
    beforeEach(function (done) {
      dockerHealthCheck.dockerClient = {
        startContainer: sinon.stub()
      };
      done();
    });

    it('should set container on good response', function (done) {
      var testContainer = 'Titan';
      dockerHealthCheck.container = testContainer;
      dockerHealthCheck.dockerClient.startContainer
        .yieldsAsync(null);

      dockerHealthCheck.startInfoContainer(function (err) {
        expect(err).to.not.exist();
        expect(dockerHealthCheck.dockerClient.startContainer
          .withArgs(testContainer).called).to.be.true();

        done();
      });
    });

    it('should cb error', function (done) {
      var testError = 'ice sword';
      dockerHealthCheck.dockerClient.startContainer
        .yieldsAsync(testError);

      dockerHealthCheck.startInfoContainer(function (err) {
        expect(err).to.exist();

        done();
      });
    });
  }); // end startInfoContainer

  describe('removeInfoContainer', function () {
    beforeEach(function (done) {
      dockerHealthCheck.dockerClient = {
        removeContainer: sinon.stub()
      };
      done();
    });

    it('should set container on good response', function (done) {
      var testContainer = 'Titan';
      dockerHealthCheck.container = testContainer;
      dockerHealthCheck.dockerClient.removeContainer
        .yieldsAsync(null);

      dockerHealthCheck.removeInfoContainer(function (err) {
        expect(err).to.not.exist();
        expect(dockerHealthCheck.dockerClient.removeContainer
          .withArgs(testContainer).called).to.be.true();

        done();
      });
    });

    it('should cb error', function (done) {
      var testError = 'ice sword';
      dockerHealthCheck.dockerClient.removeContainer
        .yieldsAsync(testError);

      dockerHealthCheck.removeInfoContainer(function (err) {
        expect(err).to.exist();

        done();
      });
    });
  }); // end removeInfoContainer

  describe('readInfoContainer', function () {
    beforeEach(function (done) {
      dockerHealthCheck.dockerClient = {
        containerLogs: sinon.stub()
      };
      done();
    });

    it('should set logs on good response', function (done) {
      var testContainer = 'Titan';
      var testLogs = JSON.stringify({ test: 'me' });
      dockerHealthCheck.container = testContainer;
      dockerHealthCheck.dockerClient.containerLogs
        .yieldsAsync(null, testLogs);

      dockerHealthCheck.readInfoContainer(function (err) {
        expect(err).to.not.exist();
        expect(dockerHealthCheck.dockerClient.containerLogs
          .withArgs(testContainer).called).to.be.true();
        expect(dockerHealthCheck.containerLogs).exist();

        done();
      });
    });

    it('should cb error is error emited', function (done) {
      var testContainer = 'Titan';
      var testLogs = JSON.stringify({ error: 'firestone' });
      dockerHealthCheck.container = testContainer;
      dockerHealthCheck.dockerClient.containerLogs
        .yieldsAsync(null, testLogs);

      dockerHealthCheck.readInfoContainer(function (err) {
        expect(err).to.exist();
        expect(dockerHealthCheck.dockerClient.containerLogs
          .withArgs(testContainer).called).to.be.true();

        done();
      });
    });

    it('should error on parse err', function (done) {
      var testContainer = 'Titan';
      var testLogs = 'cantparse';
      dockerHealthCheck.container = testContainer;
      dockerHealthCheck.dockerClient.containerLogs
        .yieldsAsync(null, testLogs);

      dockerHealthCheck.readInfoContainer(function (err) {
        expect(err).to.exist();
        expect(dockerHealthCheck.dockerClient.containerLogs
          .withArgs(testContainer).called).to.be.true();

        done();
      });
    });

    it('should cb error', function (done) {
      var testError = 'ice sword';
      dockerHealthCheck.dockerClient.containerLogs
        .yieldsAsync(testError);

      dockerHealthCheck.readInfoContainer(function (err) {
        expect(err).to.exist();

        done();
      });
    });
  }); // end readInfoContainer

  describe('reportData', function () {
    beforeEach(function (done) {
      sinon.stub(rabbitmq, 'publishOnDockUnhealthy');
      sinon.stub(monitorDog, 'gauge');
      process.env.RSS_LIMIT = 1;
      done();
    });

    afterEach(function (done) {
      rabbitmq.publishOnDockUnhealthy.restore();
      monitorDog.gauge.restore();
      delete process.env.RSS_LIMIT;
      done();
    });

    it('should send gauge data and not publish unhealthy', function (done) {
      var testHost = 'http://localhost:4242';
      var testContainerLogs = {
        info: {
          testKey: '1234 kb',
          testAnotherKey: '2135'
        }
      };
      dockerHealthCheck.containerLogs = testContainerLogs;
      dockerHealthCheck.dockerHost = testHost;
      monitorDog.gauge.returns();

      dockerHealthCheck.reportData(function (err) {
        expect(err).to.not.exist();
        expect(rabbitmq.publishOnDockUnhealthy
          .called).to.be.false();
        expect(monitorDog.gauge.withArgs('testKey',
          1234, ['dockerHost:' + testHost]).called).to.be.true();
        expect(monitorDog.gauge.withArgs('testAnotherKey',
          2135, ['dockerHost:' + testHost]).called).to.be.true();

        done();
      });
    });

    it('should send gauge data and publish unhealthy', function (done) {
      var testHost = 'http://localhost:4242';
      var testContainerLogs = {
        info: {
          VmRSS: '1234 kb',
        }
      };
      dockerHealthCheck.containerLogs = testContainerLogs;
      dockerHealthCheck.dockerHost = testHost;
      monitorDog.gauge.returns();

      dockerHealthCheck.reportData(function (err) {
        expect(err).to.not.exist();
        expect(rabbitmq.publishOnDockUnhealthy
          .called).to.be.true();
        expect(monitorDog.gauge.withArgs('VmRSS',
          1234, ['dockerHost:' + testHost]).called).to.be.true();

        done();
      });
    });
  }); // end reportData

  describe('isDataValid', function () {
    it('should return false if data missing keys', function (done) {
      var testData = {
        dockerHost: 'host',
        githubId: 2134
      };
      Object.keys(testData, function (key) {
        var data = clone(testData);
        delete data[key];
        expect(dockerHealthCheck.isDataValid(data))
          .to.be.false();
      });

      expect(dockerHealthCheck.isDataValid({}))
          .to.be.false();

      done();
    });

    it('should return true if all keys present', function (done) {
      var testData = {
        dockerHost: 'host',
        githubId: 2134
      };
      expect(dockerHealthCheck.isDataValid(testData))
        .to.be.true();

      done();
    });
  }); // end isDataValid
});