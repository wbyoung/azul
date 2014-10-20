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
    // TODO: this is somewhat duplicated from Class.extend
    var args = Array.prototype.slice.call(arguments);
    var properties = args.reduce(function(prev, obj) {
      return Mixin.wrap.super.properties(obj, prev);
    }, {});
    _.extend(this, properties);
  }
});

// patch Class.extend to support mixins
Class.__metaclass__.prototype.extend = (function(extend) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var mixins = [];
    while (args[0] instanceof Mixin.__class__) {
      mixins.push(args.shift());
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
