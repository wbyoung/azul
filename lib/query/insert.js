'use strict';

var _ = require('lodash');
var BaseQuery = require('./base');
var Transaction = require('./mixins/transaction');

/**
 * Begin an insert query chain. Like all other methods that begin a query
 * chain, this method is intended to be called only once and is mutually
 * exclusive with those methods.
 *
 *     insert('users').values({ name: 'Whitney' })
 *     // -> insert into "users" ("name") values (?)
 *     // !> ['Whitney']
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
 * @mixes Transaction
 */
var InsertQuery = BaseQuery.extend(Transaction, /** @lends InsertQuery# */ {
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
    this._values = values && this._toValuesArray([values]);
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
   * Convert arguments to a values array. Mixins may override this to alter the
   * values array.
   *
   * @method
   * @protected
   * @param {Array} args Arguments passed to {@link InsertQuery#values} or
   * {@link Database#insert}.
   * @return {Array} The values array.
   * @see {@link InsertQuery#_toValues}
   */
  _toValuesArray: function(args) {
    var values = _.toArray(args);
    if (values.length === 1 && _.isArray(values[0])) {
      values = values[0];
    }
    return values.map(this._toValues.bind(this));
  },

  /**
   * Covert object to an object suitable for use in the query. Mixins may
   * override this to alter the values.
   *
   * @method
   * @protected
   * @param {Object} values Values to convert.
   * @return {Object} The converted values.
   * @see {@link UpdateQuery#_toValues}
   */
  _toValues: function(values) {
    return values;
  },

  /**
   * Define values to insert. For instance:
   *
   *     insert('users').values({ name: 'Whitney' })
   *     // -> insert into "users" ("name") values (?)
   *     // !> ['Whitney']
   *
   * @param {...Object} values Values to insert.
   * @return {InsertQuery} The newly configured query.
   */
  values: function() {
    var dup = this._dup();
    dup._values = (dup._values || [])
      .concat(dup._toValuesArray(arguments));
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
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    var size = _.reduce(this._values, function(size, values) {
      return size + _.size(values);
    }, 0);
    if (!size) {
      throw new Error('Insert query is missing values to insert.');
    }
    return this._adapter.phrasing.insert({
      table: this._table,
      returning: this._returning,
      values: this._values
    });
  }
});

module.exports = InsertQuery.reopenClass({ __name__: 'InsertQuery' });
