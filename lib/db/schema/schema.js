'use strict';

var RawQuery = require('../query/raw');
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
var Schema = RawQuery.extend(/** @lends Schema# */{
  init: function(adapter) {
    this._super();
    this._adapter = adapter;
  },

  /**
   * Documentation forthcoming.
   */
  createTable: function() { return this._spawn(CreateTableQuery, arguments); },

  /**
   * Documentation forthcoming.
   */
  dropTable: function() { return this._spawn(DropTableQuery, arguments); },

  sql: function() {
    var result = this._super();
    if (!result) {
      throw new Error('Schema cannot be executed. ' +
        'You must first call one of the schema methods.');
    }
    return result;
  }
});

module.exports = Schema.reopenClass({ __name__: 'Schema' });
