'use strict';

var _ = require('lodash');
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
    var args = Array.prototype.slice.call(arguments);
    var combined = args.reduce(function(array, arg) {
      var isMixin = arg instanceof Mixin.__class__;
      var mixins = isMixin ? arg._mixins : [arg];
      return array.concat(mixins);
    }, []);
    this._mixins = combined;
  }
});

// patch Class.extend to support mixins
Class.__metaclass__.prototype.extend = (function(extend) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var mixins = [];
    while (args[0] instanceof Mixin.__class__) {
      mixins = mixins.concat(args.shift()._mixins);
    }

    var properties = {};
    if (args.length) {
      properties = args.shift();
      args.unshift({});
    }
    var cls = extend.apply(this, args);
    mixins.forEach(function(mixin) {
      cls.reopen(mixin);
    });
    cls.reopen(properties);

    return cls;
  };
}(Class.__metaclass__.prototype.extend));

module.exports = Mixin;
