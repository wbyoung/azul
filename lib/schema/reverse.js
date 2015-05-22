'use strict';

var Schema = require('./schema');

/**
 * A reverse schema object that reverses that actions being taken.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#reverse}.
 *
 * @protected
 * @constructor
 * @extends BaseQuery
 * @mixes Transaction
 */
var ReverseSchema = Schema.extend(/** @lends ReverseSchema# */ {
  init: function() { throw new Error('ReverseSchema must be spawned.'); },

  /**
   * Create a table.
   *
   * All table creation actions are reversible.
   *
   * @method
   * @public
   * @see {@link Schema#createTable}
   */
  createTable: function(name) {
    return this.dropTable.superFunction.call(this, name);
  },

  /**
   * Alter a table.
   *
   * Some table creation actions are reversible.
   *
   * @method
   * @public
   * @see {@link Schema#alterTable}
   */
  alterTable: function() {
    return this._super.apply(this, arguments).reverse();
  },

  /**
   * Drop a table.
   *
   * Not reversible.
   *
   * @method
   * @public
   * @see {@link Schema#dropTable}
   */
  dropTable: function() {
    throw new Error('Drop table has no reverse action');
  },

  /**
   * Rename a table.
   *
   * All table creation actions are reversible.
   *
   * @method
   * @public
   * @see {@link Schema#renameTable}
   */
  renameTable: function(from, to) {
    return this._super.call(this, to, from);
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    throw new Error('Must first call one of the reversible schema methods.');
  }
});

module.exports = ReverseSchema.reopenClass({ __name__: 'ReverseSchema' });
