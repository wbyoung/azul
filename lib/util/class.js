'use strict';

var _ = require('lodash');

var Class = function() {};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Class.extend = function(properties) {
  var parent = this;
  var init = properties && properties.init;
  var child = function() {
    parent.apply(this, arguments);
    if (init) { init.apply(this, arguments); }
  }
  child.prototype = Object.create(parent.prototype);
  child.prototype.constructor = child;
  child.extend = Class.extend;
  child.__super__ = parent.prototype;
  _.extend(child.prototype, properties);
  return child;
};

module.exports = Class;
