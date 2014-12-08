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
   * Documentation forthcoming.
   */
  begin: function() {
    return Statement.create('BEGIN');
  },

  /**
   * Documentation forthcoming.
   */
  rollback: function() {
    return Statement.create('ROLLBACK');
  },

  /**
   * Documentation forthcoming.
   */
  commit: function() {
    return Statement.create('COMMIT');
  }

});
