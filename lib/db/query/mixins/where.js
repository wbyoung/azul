'use strict';

var Mixin = require('../../../util/mixin');
var Condition = require('../../condition'), w = Condition.w;

/**
 * Where support for queries.
 *
 * @mixin Where
 */
module.exports = Mixin.create(/** @lends Where */{
  init: function() {
    this._super.apply(this, arguments);
    this._where = undefined;
  },

  _dup: function() {
    var dup = this._super();
    dup._where = this._where && Condition.create(this._where);
    return dup;
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
   * @since 1.0
   * @public
   * @method
   * @param {...(Condition|Object)} conditions The conditions by which to filter
   * the query.
   * @return {Query} The newly configured query.
   * @see Condition
   */
  where: function() {
    var dup = this._dup();

    var args = Array.prototype.slice.call(arguments);
    var conditions = dup._where ? [dup._where].concat(args) : args;
    dup._where = w.apply(null, conditions);

    return dup;
  }
});
