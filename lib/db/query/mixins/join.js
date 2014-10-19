'use strict';

var Condition = require('../../condition'), w = Condition.w;

module.exports = {
  // TODO: mixins: add an `init` that sets up the `_where` instance variable
  // once mixins are fully supported.

  /**
   * Documentation forthcoming.
   *
   * @param {String} table The table on which to join.
   * @param {String} [type] The join type. This can be one of:
   *   - `'inner'` An inner join
   *   - `'left'` A left outer join
   *   - `'right'` A right outer join
   *   - `'full'` A full outer join
   *   - `'cross'` A cross join (the default)
   * @param {...(Condition|Object|String)} conditions The conditions on which to
   * join. If provided as an object or string, it will be converted to a proper
   * {@link Condition}.
   * @see {@link http://blog.codinghorror.com/a-visual-explanation-of-sql-joins/|A Visual Explanation of SQL Joins}
   * @return {Query} The newly configured query.
   */
  join: function(table, type, condition) {
    var dup = this._dup();
    var args = Array.prototype.slice.call(arguments);

    table = args.shift();

    var types = ['inner', 'left', 'right', 'full', 'cross'];
    var typeGiven = types.indexOf(args[0]) !== -1;
    type = typeGiven ? args.shift() : 'cross';

    condition = args.length > 0 ? w.apply(null, args) : null;

    dup._joins.push({
      table: table,
      type: type,
      condition: condition
    });

    return dup;
  }
};
