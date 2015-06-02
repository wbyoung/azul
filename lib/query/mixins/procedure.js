'use strict';

var Mixin = require('corazon/mixin');
var EntryQuery = require('../entry');

/**
 * Procedure support for queries.
 *
 * This allows queries to run a full procedure when a single statement cannot
 * represent the intended query. Note that this mixin allows queries to become
 * _procedures_ that do not execute their statement.
 *
 * @mixin Procedure
 */
module.exports = Mixin.create({

  /**
   * Override of {@link BaseQuery#execute}.
   *
   * Executes the query normally if a procedure is not required. Otherwise it
   * executes the procedure (and this is no longer truly operating like a
   * query object).
   *
   * @method
   * @protected
   * @see {@link BaseQuery#execute}
   */
  execute: function() {
    var procedure = this._procedure();
    return procedure ?
      (this._presult = this._presult || procedure(this._procedureQuery())) :
      (this._super.apply(this, arguments));
  },

  /**
   * Get the query sent to a procedure.
   *
   * @method
   * @private
   * @return {EntryQuery}
   */
  _procedureQuery: function() {
    return this._spawn(EntryQuery, []);
  },

  /**
   * Override point for query procedure.
   *
   * Queries that return a procedure from this method will no longer execute
   * their {@link BaseQuery#statement} and will instead execute the procedure.
   *
   * @method
   * @public
   * @return {?Procedure}
   */
  _procedure: function() { },

});
