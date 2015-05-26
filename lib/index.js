'use strict';

var _ = require('lodash');

var Database = require('./database');
var Model = require('./model');
var Manager = require('./model/manager');
var Condition = require('./condition');
var Migration = require('./migration');
var Adapter = require('./adapters/base');
var core = {
  Class: require('./util/class'),
  Mixin: require('./util/mixin'),
  property: require('./util/property').fn,
};

var azul = function(config) {
  return Database.create(config);
};

module.exports = _.extend(azul, {
  Model: Model,
  Manager: Manager,
  Database: Database,
  Migration: Migration,
  Adapter: Adapter,
  Condition: Condition,
  w: Condition.w,
  f: Condition.f,
  l: Condition.l,
  attr: Model.attr,
  hasMany: Model.hasMany,
  belongsTo: Model.belongsTo,
  core: core,
});
