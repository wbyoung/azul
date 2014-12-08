'use strict';

var _ = require('lodash');
var Mixin = require('../../util/mixin');
var Condition = require('../../condition'), w = Condition.w;

/**
 * Where support for queries.
 *
 * @mixin Where
 */
module.exports = Mixin.create(/** @lends Where# */ {
  init: function() {
    this._super();
    this._where = undefined;
  },

  /**
   * Duplication implementation.
   *
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._where = orig._where && Condition.create(orig._where);
  },

  /**
   * Filter results based on conditions. This method relies heavily on the use of
   * conditions. Using `Condition`, you can build complex queries. For simple
   * queries, simply pass in an object.
   *
   *     select('users').where({ id: 1 })
   *     select('users').where([{ first: 'Whitney' }, w.or, { first: 'Whit' }], w.and, { last: 'Young' })
   *     select('users').where({ 'age[gt]': 30 })
   *
   * @public
   * @method
   * @param {...(Condition|Object)} conditions The conditions by which to filter
   * the query.
   * @return {ChainedQuery} The newly configured query.
   * @see Condition
   */
  where: function() {
    var dup = this._dup();

    var args = _.toArray(arguments);
    var conditions = dup._where ? [dup._where].concat(args) : args;
    dup._where = w.apply(null, conditions);

    return dup;
  }
});
