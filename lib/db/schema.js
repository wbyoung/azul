'use strict';

var RawQuery = require('./query/raw');
var Class = require('../util/class');

var CreateTableQuery = RawQuery.extend(/** @lends CreateTableQuery# */{
  init: function(adapter, name, cb) {
    this._adapter = adapter;
    this._name = name;
    this._columns = this._extractColumns(cb);
  },

  /**
   * Extract columns from the callback.
   *
   * @private
   * @return {Array} The column information.
   */
  _extractColumns: function(cb) {
    // TODO: handle more types & options
    var columns = [];
    var callables = {
      string: function(name) { columns.push({ name: name, type: 'string' }); }
    };
    cb(callables);
    return columns;
  },

  /**
   * Generate SQL for a query.
   *
   * @see {Query#sql}.
   */
  sql: function() {
    return this._adapter.phrasing.createTable({
      name: this._name,
      columns: this._columns
    });
  }

});

CreateTableQuery.reopenClass({ __name__: 'CreateTableQuery' });

/**
 * Queries are the building block of Azul's schema migration layer. They
 * are are a slightly less flexible version of the {@link Query} object. For
 * instance, they're not immutable and chainable. Instead, they expose a suite
 * of functionality that allows schema manipulation.
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
    this._adapter = adapter;
  },

  createTable: function(name, cb) {
    return CreateTableQuery.create(this._adapter, name, cb);
  }
});


module.exports = Schema.reopenClass({ __name__: 'Schema' });
