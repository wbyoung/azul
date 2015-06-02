'use strict';

var Mixin = require('corazon/mixin');
var Statement = require('../types/statement');

/**
 * Phrasing mixin for select statement & related fragments.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Select statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {Array.<String>} data.tables
   * @param {Condition} data.where
   * @param {Array.<Object>} data.joins
   * @param {Integer} data.limit
   * @param {Object} data.order
   * @param {Array.<String>} data.columns The columns to select.
   * @see {Phrasing#where}
   * @see {Phrasing#join}
   * @see {Phrasing#limit}
   * @see {Phrasing#order}
   * @see {Grammar#field}
   * @return {Statement} The statement.
   */
  select: function(data) {
    var where = data.where;
    var limit = data.limit;
    var order = data.order;
    var groupBy = data.groupBy;

    var quote = this._grammar.field.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);

    var fragments = [].concat(
      ['SELECT '], delimit(data.columns.map(quote)),
      [' FROM '], delimit(data.tables.map(quote)));

    data.joins.forEach(function(join) {
      fragments.push(' ', this.join(join));
    }, this);

    if (where) { fragments.push(' ', this.where(where)); }
    if (groupBy) { fragments.push(' ', this.groupBy(groupBy)); }
    if (order.length) { fragments.push(' ', this.order(order)); }
    if (limit !== undefined) {
      fragments.push(' ', this.limit(limit, data.offset));
    }

    return Statement.create(join(fragments));
  },

  /**
   * Create where fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Condition} condition
   * @return {Fragment} The fragment.
   */
  where: function(condition) {
    return this._grammar.join([
      'WHERE', ' ', condition.build(this._grammar, this._translator)
    ]);
  },

  /**
   * Create limit fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Integer} limit
   * @return {Fragment} The fragment.
   */
  limit: function(limit, offset) {
    var fragments = ['LIMIT', ' ', limit];
    if (offset) {
      fragments.push(' ', 'OFFSET', ' ', offset);
    }
    return this._grammar.join(fragments);
  },

  /**
   * Create group by fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {String} field
   * @return {Fragment} The fragment.
   */
  groupBy: function(field) {
    return this._grammar.join(['GROUP BY', ' ', this._grammar.field(field)]);
  },

  /**
   * @typedef {Object} Phrasing~OrderSpec
   * @property {String} field The field name to order by.
   * @property {String} direction Either `asc` or `desc`.
   */

  /**
   * Create order fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Array.<Phrasing~OrderSpec>} orderSpecifications
   * @return {Fragment} The fragment.
   */
  order: function(orderSpecifications) {
    var quote = this._grammar.field.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);
    var orderings = orderSpecifications.map(function(order) {
      return join([quote(order.field), ' ', order.direction.toUpperCase()]);
    });
    var fragments = ['ORDER BY '].concat(delimit(orderings));
    return join(fragments);
  },

  /**
   * Create join fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Object} join
   * @param {String} join.table
   * @param {Condition} join.condition
   * @param {String} join.type One of `inner`, `left`, `right`, or `full`.
   * @return {Fragment} The fragment.
   */
  join: function(join) {
    var quote = this._grammar.field.bind(this._grammar);
    var fragments = [join.type.toUpperCase(), ' JOIN ', quote(join.table)];
    if (join.alias) {
      fragments.push(' ', quote(join.alias));
    }
    if (join.condition) {
      fragments.push(' ON ', join.condition.build(
        this._grammar,
        this._translator));
    }
    else {
      fragments.push(' ON TRUE');
    }
    return this._grammar.join(fragments);
  }

});
