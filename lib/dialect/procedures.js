'use strict';

var Class = require('corazon/class');
var Promise = require('bluebird');


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
   * Create table procedure.
   *
   * Alternative to {@link Phrasing#createTable} when performing operations
   * that cannot be completed in a single query.
   *
   * @method
   * @public
   * @param {Object} data matching {@link Phrasing#alterTable}
   * @return {?Procedure}
   */
  createTable: function(/*data*/) {
  },

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

  /**
   * A wrapper that allows conditional enabling of a transaction for a
   * procedure.
   *
   * This is provided as a convenience for subclasses.
   *
   * @method
   * @protected
   * @param {Bool} enabled Whether a transaction is required or not.
   * @param {Procedure} fn The procedure function.
   * @return {Procedure}
   */
  _inTransaction: function(enabled, fn) {
    return function(query) {
      var transaction;
      var promise = Promise.resolve();
      if (enabled) {
        transaction = query.transaction();
        query = query.transaction(transaction);
        promise = promise.then(function() {
          return transaction.begin();
        });
      }

      // call through to the original function
      promise = promise.then(fn.bind(this, query));

      if (enabled) {
        promise = promise
        .then(function() { return transaction.commit(); })
        .catch(function(e) {
          return transaction.rollback().execute().throw(e);
        });
      }
      return promise;
    };
  },

});

module.exports = Procedures.reopenClass({ __name__: 'Procedures' });
