'use strict';

var _ = require('lodash');
var BaseQuery = require('./base');
var Where = require('./mixins/where');

/**
 * Begin an update query chain. Like all other methods that begin a query
 * chain, this method is intended to be called only once and is mutually
 * exclusive with those methods.
 *
 * Documentation forthcoming.
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the {@link Database}.
 *
 * @since 1.0
 * @public
 * @method EntryQuery#update
 * @param {String} table The table in which data will be updated.
 * @param {Object} [values] The values to set.
 * @return {UpdateQuery} The newly configured query.
 * @see Database#update
 */

/**
 * An update query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#update}.
 *
 * @since 1.0
 * @protected
 * @constructor UpdateQuery
 * @extends BaseQuery
 */
var UpdateQuery = BaseQuery.extend(Where, /** @lends UpdateQuery# */ {
  init: function() { throw new Error('UpdateQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @private
   * @method
   * @see {@link BaseQuery#_create}
   * @see {@link Database#update} for parameter details.
   */
  _create: function(table, values) {
    this._super();
    this._table = table;
    this._values = values || {};
  },

  /**
   * Duplication implementation.
   *
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._table = orig._table;
    this._values = _.clone(orig._values);
  },

  /**
   * Define values to set. For instance:
   *
   *     update('users').set({ name: 'Whitney' })
   *     // -> update "users" set "name" = ?
   *     // -> ['Whitney']
   *
   * @param {Object} values Values to insert.
   * @return {InsertQuery} The newly configured query.
   */
  set: function(values) {
    var dup = this._dup();
    dup._values = _.extend({}, this._values, values);
    return dup;
  },

  sql: function() {
    if (!Object.keys(this._values).length) {
      throw new Error('Must specify values to set.');
    }
    return this._adapter.phrasing.update({
      table: this._table,
      values: this._values,
      where: this._where
    });
  }
});

module.exports = UpdateQuery.reopenClass({ __name__: 'UpdateQuery' });
