'use strict';

var Mixin = require('../../../util/mixin');
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
   * Documentation forthcoming.
   */
  _take: function(orig) {
    this._super(orig);
    this._transforms = orig._transforms.slice(0);
  },

  /**
   * Documentation forthcoming.
   */
  transform: function(fn) {
    this._transforms.push(fn);
    return this;
  },

  /**
   * Documentation forthcoming.
   */
  _applyTransforms: function(result) {
    return this._transforms.reduce(function(transformed, fn) {
      return fn(transformed);
    }, result);
  },

  /**
   * Override of {@link BaseQuery#execute}.
   *
   * @private
   * @see {@link BaseQuery#execute}
   */
  execute: BluebirdPromise.method(function() {
    return this._super().then(this._applyTransforms.bind(this));
  })
});
