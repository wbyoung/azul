'use strict';

var RawQuery = require('./raw');
var Where = require('./mixins/where');
var Join = require('./mixins/join');

/**
 * Begin a select query chain. Like all other methods that begin a query chain,
 * this method is intended to be called only once and is mutually exclusive
 * with those methods.
 *
 *     select('people') // -> select * from people
 *     select('people', ['firstName', 'lastName']) // -> select firstName, lastName from people
 *
 * As it is most common to select data from a single table, this method only
 * supports a single table. To select from multiple tables, use
 * {@link Query#join}.
 *
 *     select('cities', ['cities.name', 'countries.name'])
 *       .join('countries', 'cities.country_id=countries.id')
 *     // -> select cities.name, countries.name from cities left join countries on cities.country_id = countries.id
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the {@link Database}.
 *
 * @since 1.0
 * @public
 * @method Query#select
 * @param {String} table The table from which to select data.
 * @param {Array} [columns] The columns to select, defaults to all (`*`).
 * @return {SelectQuery} The newly configured query.
 * @see Database#select
 */

/**
 * A select query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Query#select}.
 *
 * @since 1.0
 * @protected
 * @constructor SelectQuery
 * @extends RawQuery
 * @mixes Where
 * @mixes Join
 */
var SelectQuery = RawQuery.extend(Where, Join, /** @lends SelectQuery# */ {

  init: function() {
    var args = Array.prototype.slice.call(arguments);
    this._super(args.shift());
    this._create.apply(this, args);
  },

  _create: function(table, columns) {
    this._tables = [table];
    this._columns = columns;
  },

  _take: function(orig) {
    this._super(orig);
    this._tables = orig._tables.slice(0);
    this._columns = orig._columns && orig._columns.slice(0);
  },

  sql: function() {
    return this._adapter.phrasing.select({
      tables: this._tables,
      columns: this._columns || '*',
      joins: this._joins,
      where: this._where
    });
  }

});

module.exports = SelectQuery.reopenClass({ __name__: 'SelectQuery' });
