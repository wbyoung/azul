'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Promise = require('bluebird');

/**
 * Transform support for queries.
 *
 * @mixin Transform
 */
module.exports = Mixin.create(/** @lends Transform# */ {
  init: function() {
    this._super.apply(this, arguments);
    this._transforms = [];
  },

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
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
   * @method
   * @public
   * @scope internal
   * @param {Transform~Fn} fn The transformation function to call.
   * @return {ChainedQuery} A new query of the given type.
   */
  transform: function(fn) {
    var dup = this._dup();
    dup._transforms.push(fn);
    return dup;
  },

  /**
   * Remove a transform function from the existing set of transformation
   * functions.
   *
   * @method
   * @public
   * @scope internal
   * @param {Transform~Fn} fn The transformation function to remove.
   * @return {ChainedQuery} A new query of the given type.
   */
  untransform: function(fn) {
    var dup = this._dup();
    _.pull(dup._transforms, fn);
    return dup;
  },

  /**
   * Apply transformations to a result. This will iterate through all available
   * {@link Transform~Fn} transforms that have been set on this query via
   * {@link Transform#transform} and apply them.
   *
   * @method
   * @private
   * @param {Object} result The object to apply transformations to.
   * @return {Object} The transformed result.
   */
  _applyTransforms: function(result) {
    var self = this;
    return this._transforms.reduce(function(promise, fn) {
      return promise.then(fn.bind(self));
    }, Promise.resolve(result));
  },

  /**
   * Override of {@link BaseQuery#_process}. Applies transformations to the
   * final result of the query.
   *
   * @private
   * @see {@link BaseQuery#_process}
   */
  _process: Promise.method(function(/*result*/) {
    return this._super.apply(this, arguments)
      .then(this._applyTransforms.bind(this));
  })
});
