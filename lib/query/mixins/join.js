'use strict';

var _ = require('lodash');
var Mixin = require('../../util/mixin');
var Condition = require('../../condition'), w = Condition.w;

/**
 * Join support for queries.
 *
 * @mixin Join
 */
module.exports = Mixin.create(/** @lends Join# */ {
  init: function() {
    this._super();
    this._joins = [];
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
    this._joins = orig._joins.slice(0);
  },

  /**
   * Specify a join for a query.
   *
   *     select('cities', ['cities.name', 'countries.name'])
   *       .join('countries', 'cities.country_id=countries.id')
   *     // -> select cities.name, countries.name from cities
   *     // -> inner join countries on cities.country_id = countries.id
   *
   * You can also specify a condition with object syntax to match a field
   * by using the {@link Condition.f} helper. Where clauses can be added as
   * well:
   *
   *     select('cities')
   *       .join('countries', 'left', { 'cities.country_id': f('countries.id') })
   *       .where({ 'cities.name[icontains]': 'city' })
   *     // -> select * from cities
   *     // -> left join countries on cities.country_id = countries.id
   *     // -> where cities.name ilike ?
   *     // !> ['%city%']
   *
   * To make a cross join, you can specify no condition an an inner join will
   * be performed with a `true` condition:
   *
   *     select('cities')
   *       .join('countries')
   *     // -> select * from cities
   *     // -> inner join countries on true
   *
   * @param {String} table The table on which to join.
   * @param {String} [type] The join type. This can be one of:
   *   - `'inner'` An inner join (the default)
   *   - `'left'` A left outer join
   *   - `'right'` A right outer join
   *   - `'full'` A full outer join
   * @param {...(Condition|Object|String)} conditions The conditions on which to
   * join. If provided as an object or string, it will be converted to a proper
   * {@link Condition}.
   * @see {@link http://blog.codinghorror.com/a-visual-explanation-of-sql-joins/|A Visual Explanation of SQL Joins}
   * @return {ChainedQuery} The newly configured query.
   */
  join: function(table, type, condition) {
    var dup = this._dup();
    var args = _.toArray(arguments);

    table = args.shift();

    var types = ['inner', 'left', 'right', 'full'];
    var typeGiven = types.indexOf(args[0]) !== -1;
    type = typeGiven ? args.shift() : 'inner';

    condition = args.length > 0 ? w.apply(null, args) : null;

    dup._joins.push({
      table: table,
      type: type,
      condition: condition
    });

    return dup;
  }
});
