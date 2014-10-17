'use strict';

var Class = require('../../util/class');
var CreateTableQuery = require('./table/create');
var DropTableQuery = require('./table/drop');

/**
 * A schema is the building block of Azul's schema migration layer. It exposes
 * methods that returns {@link RawQuery} objects.
 *
 * Generally, you will not create a schema object directly. Instead, you will
 * receive a schema object via the {@link Database}.
 *
 * @since 1.0
 * @protected
 * @constructor
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var Schema = Class.extend(/** @lends Schema# */{
  init: function(adapter) {
    this._super();
    this._adapter = adapter;
  },

  createTable: function(name, cb) {
    return CreateTableQuery.create(this._adapter, name, cb);
  },

  dropTable: function(name) {
    return DropTableQuery.create(this._adapter, name);
  }
});

module.exports = Schema.reopenClass({ __name__: 'Schema' });
