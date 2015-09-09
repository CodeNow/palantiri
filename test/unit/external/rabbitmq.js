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
var hermesClient = require('runnable-hermes');
var clone = require('101/clone');

var rabbitClient = require('../../../lib/external/rabbitmq.js');

describe('rabbitmq.js unit test', function () {
  describe('connect', function () {
    var hermesMock;
    beforeEach(function (done) {
      hermesMock = {
        connect: sinon.stub()
      };
      sinon.stub(hermesClient, 'hermesSingletonFactory').returns(hermesMock);
      done();
    });

    afterEach(function (done) {
      hermesClient.hermesSingletonFactory.restore();
      done();
    });

    it('should connect', function (done) {
      hermesMock.connect.yieldsAsync();

      rabbitClient.connect(function (err) {
        expect(err).to.not.exist();
        done();
      });
    });
  }); // end connect

  describe('loadWorkers', function () {
    beforeEach(function (done) {
      rabbitClient.hermesClient = {
        subscribe: sinon.stub()
      };
      done();
    });

    it('should subscribe health-check', function (done) {
      rabbitClient.hermesClient.subscribe.returns();

      rabbitClient.loadWorkers();
      expect(rabbitClient.hermesClient.subscribe
        .withArgs('health-check').called).to.be.true();
      done();
    });

    it('should subscribe docker-health-check', function (done) {
      rabbitClient.hermesClient.subscribe.returns();

      rabbitClient.loadWorkers();
      expect(rabbitClient.hermesClient.subscribe
        .withArgs('docker-health-check').called).to.be.true();
      done();
    });
  }); // end loadWorkers

  describe('unloadWorkers', function () {
    beforeEach(function (done) {
      rabbitClient.hermesClient = {
        unsubscribe: sinon.stub()
      };
      done();
    });

    it('should unsubscribe health-check', function (done) {
      rabbitClient.hermesClient.unsubscribe.yieldsAsync();

      rabbitClient.unloadWorkers(function (err) {
        expect(err).to.not.exist();
        expect(rabbitClient.hermesClient.unsubscribe
          .withArgs('health-check').called).to.be.true();
        done();
      });
    });

    it('should unsubscribe docker-health-check', function (done) {
      rabbitClient.hermesClient.unsubscribe.yieldsAsync();

      rabbitClient.unloadWorkers(function (err) {
        expect(err).to.not.exist();
        expect(rabbitClient.hermesClient.unsubscribe
          .withArgs('docker-health-check').called).to.be.true();
        done();
      });
    });
  }); // end unloadWorkers

  describe('publishHealthCheck', function () {
    beforeEach(function (done) {
      rabbitClient.hermesClient = {
        publish: sinon.stub()
      };
      done();
    });

    it('should publish health-check', function (done) {
      rabbitClient.hermesClient.publish.returns();

      rabbitClient.publishHealthCheck();

      expect(rabbitClient.hermesClient.publish
        .withArgs('health-check').called).to.be.true();
      expect(rabbitClient.hermesClient.publish
        .args[0][1].timestamp).to.exist();
      expect(rabbitClient.hermesClient.publish
        .args[0][1].healthCheckId).to.exist();
      done();
    });
  }); // end publishHealthCheck

  describe('publishDockerHealthCheck', function () {
    beforeEach(function (done) {
      rabbitClient.hermesClient = {
        publish: sinon.stub()
      };
      done();
    });

    it('should publish docker-health-check', function (done) {
      var testData = {
        dockerHost: 'testHost',
        githubId: 1253543
      };
      rabbitClient.hermesClient.publish.returns();

      rabbitClient.publishDockerHealthCheck(testData);

      expect(rabbitClient.hermesClient.publish
        .withArgs('docker-health-check').called).to.be.true();
      expect(rabbitClient.hermesClient.publish
        .args[0][1].timestamp).to.exist();
      expect(rabbitClient.hermesClient.publish
        .args[0][1].dockerHealthCheckId).to.exist();
      expect(rabbitClient.hermesClient.publish
        .args[0][1].dockerHost).to.equal(testData.dockerHost);
      expect(rabbitClient.hermesClient.publish
        .args[0][1].githubId).to.equal(testData.githubId);
      done();
    });

    it('should throw if missing keys', function (done) {
      var testData = {
        dockerHost: 'testHost',
        githubId: 1253543
      };

      Object.keys(testData).forEach(function (key) {
        var test = clone(testData);
        delete test[key];
        expect(function () {
          rabbitClient.hermesClient.publishDockerHealthCheck(test);
        }).to.throw();
      });
      done();
    });
  }); // end publishDockerHealthCheck

  describe('publishOnDockUnhealthy', function () {
    beforeEach(function (done) {
      rabbitClient.hermesClient = {
        publish: sinon.stub()
      };
      done();
    });

    it('should publish on-dock-unhealthy', function (done) {
      var testData = {
        host: 'testHost',
        githubId: 1253543
      };
      rabbitClient.hermesClient.publish.returns();

      rabbitClient.publishOnDockUnhealthy(testData);

      expect(rabbitClient.hermesClient.publish
        .withArgs('on-dock-unhealthy').called).to.be.true();
      expect(rabbitClient.hermesClient.publish
        .args[0][1].timestamp).to.exist();
      expect(rabbitClient.hermesClient.publish
        .args[0][1].dockerHealthCheckId).to.exist();
      expect(rabbitClient.hermesClient.publish
        .args[0][1].host).to.equal(testData.host);
      expect(rabbitClient.hermesClient.publish
        .args[0][1].githubId).to.equal(testData.githubId);
      done();
    });

    it('should throw if missing keys', function (done) {
      var testData = {
        host: 'testHost',
        githubId: 1253543
      };

      Object.keys(testData).forEach(function (key) {
        var test = clone(testData);
        delete test[key];
        expect(function () {
          rabbitClient.publishOnDockUnhealthy(test);
        }).to.throw();
      });
      done();
    });
  }); // end publishOnDockUnhealthy

  describe('_dataCheck', function () {
    it('should throw if missing keys', function (done) {
      var testData = {
        summon: 'aeon',
      };
      expect(function () {
        rabbitClient.constructor._dataCheck(testData, ['summon', 'spell']);
      }).to.throw();
      done();
    });

    it('should return if keys present', function (done) {
      var testData = {
        summon: 'aeon',
      };
      rabbitClient.constructor._dataCheck(testData, ['summon']);
      done();
    });
  }); // end _dataCheck
});