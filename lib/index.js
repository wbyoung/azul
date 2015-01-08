'use strict';

var _ = require('lodash');

// REVISIT: createOrUpdate()
// REVISIT: express transaction middleware (every request wrapped in a transaction)

// REVISIT: testing helpers. here are some things to consider that are nice to have
// during app development:
//   - handle insert of objects with specific IDs
//   - handle reseting sequence ids for testing
//   - handle stubbing timestamp based fields during testing allowing easier
//     assertions to be made. for instance, a model that has a field that is
//     configured to be set to the current time during update (or insert)
//     should be able to stub that.

// REVISIT: cli features that would be nice:
//   - azul migrate --all (which would migrate all databases that could be
//     connected to. for instance, development & test)

// REVISIT: validations (before/after save, before/after update, before/after destroy)
// REVISIT: polymorphic
// REVISIT: inherited
// REVISIT: aggregation
// REVISIT: events/hooks for logging
// REVISIT: events/hooks for lifecycle and/or validation
// REVISIT: consider Post.objects.first()

var Database = require('./database');
var Model = require('./model');
var Manager = require('./model/manager');
var Condition = require('./condition');
var Migration = require('./migration');
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
  Condition: Condition,
  w: Condition.w,
  f: Condition.f,
  l: Condition.l,
  attr: Model.attr,
  hasMany: Model.hasMany,
  belongsTo: Model.belongsTo,
  core: core,
});
