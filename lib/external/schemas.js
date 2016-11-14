'use strict'

const joi = require('joi')

exports.imageActionSchema = joi.object({
  imageTag: joi.string().required(),
  host: joi.string().required()
}).unknown().required()

exports.dockEventSchema = joi.object({
  host: joi.string().uri({ scheme: 'http' }).required(),
  // TODO: should be required in the future
  githubOrgId: joi.number()
}).unknown().required()

exports.organizationCreated =
exports.asgCheckCreated = joi.object({
  organization: joi.object({
    id: joi.number().required(),
    githubId: joi.number().required(),
    name: joi.string().required()
  }).required(),
  creator: joi.object({
    githubId: joi.number().required(),
    githubUsername: joi.string().required()
  }).unknown().required(),
  createdAt: joi.date().iso().required()
}).unknown()

exports.dockerHealthCheck = joi.object({
  dockerHost: joi.string().uri({ scheme: 'http' }).required(),
  // TODO: should be required in the future
  githubOrgId: joi.number()
}).unknown().required()

exports.empty = joi.object().required()
