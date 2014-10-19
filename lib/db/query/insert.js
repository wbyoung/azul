'use strict';

var _ = require('lodash');
var RawQuery = require('./raw');

/**
 * Begin an insert query chain. Like all other methods that begin a query
 * chain, this method is intended to be called only once and is mutually
 * exclusive with those methods.
 *
 * Documentation forthcoming.
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the {@link-to Database}.
 *
 * @since 1.0
 * @public
 * @method Query#insert
 * @param {String} table The table into which data should be inserted.
 * @param {Object|Array.<Object>} [values] The values to insert.
 * @return {InsertQuery} The newly configured query.
 * @see Database#insert
 */

/**
 * An insert query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Query#insert}.
 *
 * @since 1.0
 * @protected
 * @constructor InsertQuery
 * @extends RawQuery
 */
var InsertQuery = RawQuery.extend(/** @lends InsertQuery# */{
  init: function(adapter, table, values) {
    this._super(adapter);
    this._table = table;
    this._values = _.isArray(values) ? values : [values];
  },

  _dup: function() {
    var dup = this._super();
    dup._table = this._table;
    dup._values = this._values && this._values.slice(0);
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  values: function(values) {
    // TODO: test multiple calls to values
    var dup = this._dup();
    dup._values = _.isArray(values) ? values : [values];
    return dup;
  },

  sql: function() {
    return this._adapter.phrasing.insert({
      table: this._table,
      values: this._values
    });
  }
});

module.exports = InsertQuery.reopenClass({ __name__: 'InsertQuery' });
