'use strict';

var Adapter = require('../base');
var Statement = require('../../types/statement');
var util = require('util');

/**
 * @protected
 * @constructor
 * @extends Adapter.Phrasing
 */
var SQLite3Phrasing = Adapter.Phrasing.extend({

  /**
   * Override of {@link Phrasing#begin}.
   *
   * @method
   * @public
   * @see {@link Phrasing#begin}.
   */
  begin: function(level) {
    return Statement.create(util.format('SAVEPOINT AZULJS_%d', level));
  },

  /**
   * Override of {@link Phrasing#rollback}.
   *
   * @method
   * @public
   * @see {@link Phrasing#rollback}.
   */
  rollback: function(level) {
    return Statement.create(util.format('ROLLBACK TO AZULJS_%d', level));
  },

  /**
   * Override of {@link Phrasing#commit}.
   *
   * @method
   * @public
   * @see {@link Phrasing#commit}.
   */
  commit: function(level) {
    return Statement.create(util.format('RELEASE AZULJS_%d', level));
  }

});

module.exports = SQLite3Phrasing.reopenClass({ __name__: 'SQLite3Phrasing' });
