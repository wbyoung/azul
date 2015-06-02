'use strict';

var Mixin = require('corazon/mixin');
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
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._where = orig._where && Condition.create(orig._where);
  },

  /**
   * Covert arguments to a condition suitable for use in the query. Mixins may
   * override this to alter the condition.
   *
   * @method
   * @protected
   * @param {Array} args Arguments to convert.
   * @return {Condition} The condition.
   */
  _toCondition: function(args) {
    return w.apply(null, args);
  },

  /**
   * Filter results based on conditions. This method relies heavily on the use of
   * conditions. Using `Condition`, you can build complex queries. For simple
   * queries, simply pass in an object.
   *
   *     select('users').where({ id: 1 })
   *     select('users').where([{ first: 'Whitney' }, w.or, { first: 'Whit' }], w.and, { last: 'Young' })
   *     select('users').where({ age$gt: 30 })
   *
   * @method
   * @public
   * @param {...(Condition|Object)} conditions The conditions by which to filter
   * the query.
   * @return {ChainedQuery} The newly configured query.
   * @see Condition
   */
  where: function() {
    var dup = this._dup();
    var condition = dup._toCondition(arguments);
    dup._where = dup._where ?
      w.apply(null, [dup._where, condition]) : condition;
    return dup;
  }
});
