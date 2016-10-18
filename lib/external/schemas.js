'use strict'

const joi = require('joi')

exports.imageActionSchema = joi.object({
  imageTag: joi.string().required(),
  host: joi.string().required()
}).required()

exports.dockEventSchema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  // TODO: should be required in the future
  githubOrgId: joi.number()
}).required()

exports.asgCheckCreated = joi.object({
  orgName: joi.string().required(),
  githubId: joi.number().required(),
  createdAt: joi.date().timestamp('unix').required()
}).required()

exports.dockerHealthCheck = joi.object({
  dockerHost: joi.string().uri({ scheme: 'http' }).required(),
  // TODO: should be required in the future
  githubOrgId: joi.number()
}).required()

exports.empty = joi.object().required()