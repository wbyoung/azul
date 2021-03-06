'use strict';

var _ = require('lodash');

var Database = require('./database');
var Model = require('./model');
var Manager = require('./model/manager');
var Condition = require('maguey').Condition;
var Migration = require('./migration');
var Adapter = require('maguey').Adapter;
var core = {
  Class: require('corazon/class'),
  Mixin: require('corazon/mixin'),
  property: require('corazon/property'),
};

/**
 * Main Azul.js export. Creates a database.
 *
 * @param {Object} config
 * @return {Database}
 * @see {@link Database}
 */
var azul = function(config) {
  return Database.create(config);
};

require('./compatibility')();

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
