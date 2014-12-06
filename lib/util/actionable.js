'use strict';

var Class = require('./class');


/**
 * An actionable object, that is, an object that will perform a pre-defined
 * action only when instructed to do so. Multiple executions of an actionable
 * item are allowed, but will not re-trigger the original function, instead it
 * will return the original result.
 *
 * Invocation of the action can be done via {@link Actionable#execute} or
 * {@link Actionable#then}.
 *
 * @since 1.0
 * @protected
 * @constructor Actionable
 * @param {Function} fn The function to invoke when the action is executed.
 */
var Actionable = Class.extend(/** @lends Actionable# */ {
  init: function(fn) {
    this._fn = fn;
    this._result = undefined;
  },

  /**
   * Execute the action & return the result.
   *
   * @since 1.0
   * @public
   * @method
   * @return {Object} The result from the action's function.
   */
  execute: function() {
    if (!this._result) {
      this._result = this._fn();
    }
    return this._result;
  },

  /**
   * Assume that the actionable item yields a promise, and execute the action,
   * using the result as the basis for this then-able object.
   *
   * @since 1.0
   * @public
   * @param {Function} fulfilledHandler
   * @param {Function} rejectedHandler
   * @return {Promise} A promise that resolves based on the original action.
   */
  then: function(fulfilledHandler, rejectedHandler) {
    return this.execute().then(fulfilledHandler, rejectedHandler);
  }
});

module.exports = Actionable.reopenClass({ __name__: 'Actionable' });
