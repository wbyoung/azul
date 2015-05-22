'use strict';

var Schema = require('./schema');

/**
 * A reversible schema object that checks that actions being applied can be
 * reversed.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Scheam#reversible}.
 *
 * @protected
 * @constructor
 * @extends Schema
 */
var ReversibleSchema = Schema.extend(/** @lends ReversibleSchema# */ {
  init: function() { throw new Error('ReversibleSchema must be spawned.'); },

  /**
   * Create a table.
   *
   * All table creation actions are reversible.
   *
   * @method
   * @public
   * @see {@link Schema#createTable}
   */
  createTable: function() {
    return this._super.apply(this, arguments);
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
    return this._super.apply(this, arguments).reversible();
  },

  /**
   * Rename a table.
   *
   * All table renames are reversible.
   *
   * @method
   * @public
   * @see {@link Schema#renameTable}
   */
  renameTable: function() {
    return this._super.apply(this, arguments);
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
    throw new Error('Drop table is not reversible');
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

module.exports = ReversibleSchema.reopenClass({ __name__: 'ReversibleSchema' });
