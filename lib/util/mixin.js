'use strict';

var Class = require('./class');

/**
 * Mixin.
 *
 * @since 1.0
 * @public
 * @constructor Mixin
 * @param {...(Object|Mixin)} properties Properties to add to the mixin.
 */
var Mixin = Class.extend({
  init: function(/*properties*/) {
    // TODO: this is somewhat duplicated from Class.extend
    var args = Array.prototype.slice.call(arguments);
    this.properties = args.reduce(function(prev, obj) {
      return Mixin.wrap.super.properties((obj instanceof Mixin.__class__) ? obj.properties : obj, prev);
    }, {});
  }
});

module.exports = Mixin;
