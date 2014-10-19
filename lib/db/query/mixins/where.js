'use strict';

var Condition = require('../../condition'), w = Condition.w;

module.exports = {
  // TODO: mixins: add an `init` that sets up the `_where` instance variable
  // once mixins are fully supported.

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
};
