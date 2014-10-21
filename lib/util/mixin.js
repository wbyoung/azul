'use strict';

var _ = require('lodash');
var Class = require('./class');

/**
 * Mixin.
 *
 * @since 1.0
 * @public
 * @constructor Mixin
 * @param {...(Object|Mixin)} properties Properties and/or mixins to add to the
 * mixin.
 */
var Mixin = Class.extend({
  init: function() {
    var args = Array.prototype.slice.call(arguments);
    var combined = args.reduce(function(array, arg) {
      var isMixin = arg instanceof Mixin.__class__;
      var mixins = isMixin ? arg._all : [arg];
      return array.concat(mixins);
    }, []);

    var F = function() {};
    F.prototype = Object.create(this.__class__.prototype);
    F.prototype._all = combined;
    return _.extend(new F(), args[0]);
  }
});

Mixin.reopenClass({
  extend: function() {
    throw new Error('Cannot extend Mixin class');
  }
});

// patch Class.reopen to support mixins
Class.__metaclass__.prototype.reopen = (function(reopen) {
  return function() {
    var self = this;
    var args = Array.prototype.slice.call(arguments);

    var mixins = [];
    if (args[0] instanceof Mixin.__class__) {
      mixins = args[0]._all;
      args[0] = {};
    }

    mixins.forEach(function(mixin) {
      reopen.call(self, mixin);
    });

    return reopen.apply(self, args);
  };
}(Class.__metaclass__.prototype.reopen));

// patch Class.extend to support mixins
Class.__metaclass__.prototype.extend = (function(extend) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var mixins = [];
    while (args[0] instanceof Mixin.__class__) {
      mixins = mixins.concat(args.shift()._all);
    }

    var full = mixins.concat(args.shift());
    var mixin = Mixin.create.apply(Mixin, full);
    args.unshift(mixin);

    return extend.apply(this, args);
  };
}(Class.__metaclass__.prototype.extend));

module.exports = Mixin.reopenClass({ __name__: 'Mixin' });
