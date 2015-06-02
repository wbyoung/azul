'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Condition = require('../../condition'), w = Condition.w;

/**
 * Check if an argument is a join type.
 *
 * @function Join~isType
 * @private
 * @param {?} arg The argument to check.
 * @return {Boolean}
 */
var isType = function(str) {
  var types = ['inner', 'left', 'right', 'full'];
  return types.indexOf(str) !== -1;
};


/**
 * Join support for queries.
 *
 * @mixin Join
 */
module.exports = Mixin.create(/** @lends Join# */ {
  init: function() {
    this._super();
    this._joins = {};
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
    this._joins = _.clone(orig._joins);
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
   *       .where({ 'cities.name$icontains': 'city' })
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
   * @param {String|Object} table The table on which to join. If provided as an
   * object, the key is the table name, and the value is the alias name.
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
  join: function(/*table, [type], ...[condition]*/) {
    var dup = this._dup();
    var args = _.toArray(arguments);

    var alias;
    var table = args.shift();
    var key = table;
    var type = isType(args[0]) ? args.shift() : 'inner';
    var condition = args.length > 0 ? w.apply(null, args) : null;

    if (!_.isString(table)) {
      alias = _.values(table)[0];
      table = _.keys(table)[0];
      key = alias;
    }

    dup._joins[key] = {
      table: table,
      alias: alias,
      type: type,
      condition: condition
    };

    return dup;
  }
});
