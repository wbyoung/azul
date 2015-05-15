'use strict';

var _ = require('lodash');
var BaseQuery = require('./base');
var Fetch = require('./mixins/fetch');
var Where = require('./mixins/where');
var Limit = require('./mixins/limit');
var Join = require('./mixins/join');
var Order = require('./mixins/order');
var GroupBy = require('./mixins/group_by');
var Transaction = require('./mixins/transaction');


/**
 * Begin a select query chain. Like all other methods that begin a query chain,
 * this method is intended to be called only once and is mutually exclusive
 * with those methods.
 *
 *     select('people') // -> select * from people
 *     select('people', ['firstName', 'lastName'])
 *     // -> select firstName, lastName from people
 *
 * As it is most common to select data from a single table, this method only
 * supports a single table. To select from multiple tables, use
 * {@link Join#join}.
 *
 *     select('cities', ['cities.name', 'countries.name'])
 *       .join('countries', 'cities.country_id=countries.id')
 *     // -> select cities.name, countries.name from cities
 *     // -> inner join countries on cities.country_id = countries.id
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the {@link Database}.
 *
 * @method EntryQuery#select
 * @public
 * @param {String} table The table from which to select data.
 * @param {Array} [columns] The columns to select, defaults to all (`*`).
 * @return {SelectQuery} The newly configured query.
 * @see Database#select
 */

/**
 * A select query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#select}.
 *
 * @protected
 * @constructor SelectQuery
 * @extends BaseQuery
 * @mixes Fetch
 * @mixes Where
 * @mixes Limit
 * @mixes Join
 * @mixes Order
 * @mixes GroupBy
 * @mixes Transaction
 */
var SelectQuery = BaseQuery.extend();

SelectQuery.reopen(Fetch);
SelectQuery.reopen(Where);
SelectQuery.reopen(Limit);
SelectQuery.reopen(Join);
SelectQuery.reopen(Order);
SelectQuery.reopen(GroupBy);
SelectQuery.reopen(Transaction);

SelectQuery.reopen(/** @lends SelectQuery# */ {

  init: function() { throw new Error('SelectQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Database#select} for parameter details.
   */
  _create: function(table, columns) {
    this._super();
    this._tables = [table];
    this._rawcols = columns || ['*'];
    this._recolumn();
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
    this._tables = orig._tables.slice(0);
    this._rawcols = orig._rawcols.slice(0);
    this._columns = orig._columns.slice(0);
  },

  /**
   * Covert field to a field value suitable for use in the query. Mixins may
   * override this to alter the field.
   *
   * This calls super to ensure compatibility with mixins defining their own
   * `_toField`. The super value will be used before it attempts any
   * conversions.
   *
   * @method
   * @protected
   * @param {String} field Field to convert.
   * @return {String} The converted field.
   */
  _toField: function _toFieldSelectQuery(field) {
    return this._super.apply(this, arguments) || field;
  },

  /**
   * Re-initialize the columns for this query.
   *
   * Bound queries need to re-initialize the columns when anything changes that
   * affects the generation of column names. This protected method allows that
   * to happen whenever necessary.
   *
   * @method
   * @protected
   * @see {@link BoundJoin#join}
   */
  _recolumn: function() {
    this._columns = this._rawcols.map(this._toField.bind(this));
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return this._adapter.phrasing.select({
      tables: this._tables,
      columns: this._columns,
      joins: _.values(this._joins),
      where: this._where,
      limit: this._limit,
      offset: this._offset,
      order: this._order,
      groupBy: this._groupBy,
    });
  }

});

module.exports = SelectQuery.reopenClass({ __name__: 'SelectQuery' });
