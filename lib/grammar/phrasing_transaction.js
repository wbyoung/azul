'use strict';

var Mixin = require('../util/mixin');
var Statement = require('./statement');

/**
 * Phrasing mixin for transaction related phrases.
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
   * @return {Statement} The statement.
   */
  begin: function() {
    return Statement.create('BEGIN');
  },

  /**
   * Rollback statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @return {Statement} The statement.
   */
  rollback: function() {
    return Statement.create('ROLLBACK');
  },

  /**
   * Commit statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @return {Statement} The statement.
   */
  commit: function() {
    return Statement.create('COMMIT');
  }

});
