'use strict';

var _ = require('lodash');
var BaseQuery = require('./base');

/**
 * Begin an insert query chain. Like all other methods that begin a query
 * chain, this method is intended to be called only once and is mutually
 * exclusive with those methods.
 *
 *     insert('users').values({ name: 'Whitney' })
 *     // -> insert into "users" ("name") values (?)
 *     // -> ['Whitney']
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the {@link Database}.
 *
 * @method EntryQuery#insert
 * @public
 * @param {String} table The table into which data should be inserted.
 * @param {Object|Array.<Object>} [values] The values to insert.
 * @return {InsertQuery} The newly configured query.
 * @see Database#insert
 */

/**
 * An insert query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#insert}.
 *
 * @protected
 * @constructor InsertQuery
 * @extends BaseQuery
 */
var InsertQuery = BaseQuery.extend(/** @lends InsertQuery# */ {
  init: function() { throw new Error('InsertQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Database#insert} for parameter details.
   */
  _create: function(table, values) {
    this._super();
    this._table = table;
    this._returning = undefined;
    if (values) {
      this._values = _.isArray(values) ? values : [values];
    }
  },

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._table = orig._table;
    this._returning = orig._returning;
    this._values = orig._values && orig._values.slice(0);
  },

  /**
   * Define values to insert. For instance:
   *
   *     insert('users').values({ name: 'Whitney' })
   *     // -> insert into "users" ("name") values (?)
   *     // -> ['Whitney']
   *
   * @param {...Object} values Values to insert.
   * @return {InsertQuery} The newly configured query.
   */
  values: function() {
    var values = _.toArray(arguments);
    if (values.length === 1 && _.isArray(values[0])) {
      values = values[0];
    }
    var dup = this._dup();
    dup._values = (this._values || []).concat(values);
    return dup;
  },

  /**
   * Specify the field that should be returned (usually `id` or a column that
   * is automatically incremented).
   *
   * Some adapters may not support using `returning` based queries entirely.
   * See individual adapter notes for more details.
   *
   * @param {String} field The field name to return.
   * @return {InsertQuery} The newly configured query.
   */
  returning: function(field) {
    var dup = this._dup();
    dup._returning = field;
    return dup;
  },

  /**
   * Override of {@link BaseQuery#sql}.
   *
   * @private
   * @see {@link BaseQuery#sql}
   */
  sql: function() {
    return this._adapter.phrasing.insert({
      table: this._table,
      returning: this._returning,
      values: this._values
    });
  }
});

module.exports = InsertQuery.reopenClass({ __name__: 'InsertQuery' });
