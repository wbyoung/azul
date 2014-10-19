'use strict';

var RawQuery = require('./raw');
var Condition = require('../condition');

/**
 * Begin a query chain and specify that this is a select query. Like all other
 * methods that begin a query chain, this method is intended to be called only
 * once and is mutually exclusive with those methods.
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
 * methods provided by the DB.
 *
 * @since 1.0
 * @public
 * @method Query#select
 * @param {String} table The table from which to select data.
 * @param {Array} [columns] The columns to select, defaults to all (`*`).
 * @return {SelectQuery} The newly configured query.
 * @see Database#select
 * @see Query#join
 */
var SelectQuery = RawQuery.extend(/** @lends SelectQuery# */{
  init: function(adapter, table, columns) {
    this._super(adapter);
    this._tables = [table];
    this._columns = columns;
    this._joins = []; // TODO: mixins: move to mixin
  },

  _dup: function() {
    var dup = this._super();
    dup._tables = this._tables.slice(0);
    dup._joins = this._joins.slice(0); // TODO: mixins: move to mixin
    dup._columns = this._columns && this._columns.slice(0);
    dup._where = this._where && Condition.create(this._where);  // TODO: mixins: move to mixin
    return dup;
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

SelectQuery.reopen(require('./mixins/where'));
SelectQuery.reopen(require('./mixins/join'));

module.exports = SelectQuery.reopenClass({ __name__: 'SelectQuery' });
