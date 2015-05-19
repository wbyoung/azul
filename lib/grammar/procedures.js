'use strict';

var Class = require('../util/class');


/**
 * The procedures class is responsible for complex procedures that cannot be
 * expressed in single queries.
 *
 * @public
 * @constructor
 */
var Procedures = Class.extend();

Procedures.reopen(/** @lends Procedures# */ {

  init: function (grammar, phrasing) {
    this._super();
    this._grammar = grammar;
    this._phrasing = phrasing;
  },

  /**
   * A procedure.
   *
   * Once a procedure function is invoked, it will immediately begin executing
   * all necessary steps. Procedures return a promise to indicate when they are
   * complete.
   *
   * @function Procedure
   * @param {EntryQuery} query A query with which to build the procedure.
   * @return {Promise} A promise resolving when the procedure completes.
   */

  /**
   * Alter table procedure.
   *
   * Alternative to {@link Phrasing#alterTable} when performing operations
   * other than adding columns.
   *
   * @method
   * @public
   * @param {Object} data matching {@link Phrasing#alterTable}
   * @return {?Procedure}
   */
  alterTable: function(/*data*/) {
  },

});

module.exports = Procedures.reopenClass({ __name__: 'Procedures' });
