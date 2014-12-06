'use strict';

var _ = require('lodash');
var BaseQuery = require('../query/base');
var CreateTableQuery = require('./table/create');
var DropTableQuery = require('./table/drop');

/**
 * A schema is the building block of Azul's schema migration layer. It exposes
 * methods that returns {@link BaseQuery} objects.
 *
 * Generally, you will not create a schema object directly. Instead, you will
 * receive a schema object via the {@link Database}.
 *
 * @since 1.0
 * @protected
 * @constructor
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var Schema = BaseQuery.extend(/** @lends Schema# */ {

  /**
   * Documentation forthcoming.
   */
  createTable: function() { return this._spawn(CreateTableQuery, arguments); },

  /**
   * Documentation forthcoming.
   */
  dropTable: function() { return this._spawn(DropTableQuery, arguments); },

  sql: function() {
    var result, underlyingError;
    try { result = this._super(); }
    catch (e) { underlyingError = e; }
    if (!result) {
      var msg = 'Must first call one of the schema methods.';
      throw _.extend(new Error(msg), {
        underlyingError: underlyingError
      });
    }
    return result;
  }
});

module.exports = Schema.reopenClass({ __name__: 'Schema' });
