'use strict';

var Mixin = require('corazon/mixin');
var Statement = require('../types/statement');

/**
 * Phrasing mixin for transaction statements.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Begin statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Number} level The level/depth at which this is being run.
   * @return {Statement} The statement.
   */
  begin: function(/*level*/) {
    return Statement.create('BEGIN');
  },

  /**
   * Rollback statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Number} level The level/depth at which this is being run.
   * @return {Statement} The statement.
   */
  rollback: function(/*level*/) {
    return Statement.create('ROLLBACK');
  },

  /**
   * Commit statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Number} level The level/depth at which this is being run.
   * @return {Statement} The statement.
   */
  commit: function(/*level*/) {
    return Statement.create('COMMIT');
  }

});
