'use strict';

var Mixin = require('../../util/mixin');
var BluebirdPromise = require('bluebird');

/**
 * Transform support for queries.
 *
 * @mixin Transform
 */
module.exports = Mixin.create(/** @lends Transform# */{
  init: function() {
    this._super.apply(this, arguments);
    this._transforms = [];
  },

  /**
   * Duplication implementation.
   *
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._transforms = orig._transforms.slice(0);
  },


  /**
   * @function Transform~Fn
   * @param {Object} result The result of the query (with any previous
   * transforms already applied).
   * @param {Class} queryType The type of query that was performed.
   */

  /**
   * Add a transform function to the end of the existing set of transformation
   * functions.
   *
   * @param {Transform~Fn} fn The transformation function to call.
   */
  transform: function(fn) {
    this._transforms.push(fn);
    return this;
  },

  /**
   * Documentation forthcoming.
   */
  _applyTransforms: function(result) {
    var type = this.__identity__;
    return this._transforms.reduce(function(transformed, fn) {
      return fn(transformed, type);
    }, result);
  },

  /**
   * Override of {@link BaseQuery#_execute}.
   *
   * @private
   * @see {@link BaseQuery#_execute}
   */
  _execute: BluebirdPromise.method(function() {
    return this._super().then(this._applyTransforms.bind(this));
  })
});
