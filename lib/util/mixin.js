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
    return args.reduce(function(dependency, mixin) {
      while (mixin) { // extend dependency chain to include existing mixins
        dependency = Mixin._link(mixin, dependency);
        mixin = mixin._dependency;
      }
      return dependency;
    }, undefined);
  }
});

Mixin.reopenClass({
  extend: function() {
    throw new Error('Cannot extend Mixin class');
  },

  /**
   * Link objects together through a hidden `_dependency` property that
   * basically creates a linked-list.
   *
   * @param {Object} mixin A mixin to link.
   * @param {Object} next The next mixin in the chain.
   * @return {Mixin} The linked mixin.
   */
  _link: function(mixin, next) {
    var F = function() {};
    F.prototype = Object.create(Mixin.__class__.prototype);
    F.prototype._dependency = next;
    return _.extend(new F(), mixin);
  }
});

// patch Class.extend to support mixins
Class.__metaclass__.prototype.extend = (function(extend) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var mixins = [];
    while (args[0] instanceof Mixin.__class__) {
      var mixin = args.shift();
      while(mixin) {
        // mixins are linked to their dependencies, unshift each to get them in
        // the proper order for adding them to the created class.
        mixins.unshift(mixin);
        mixin = mixin._dependency;
      }
    }

    // pull out the properties from the arguments & replace with an empty
    // object so that we can add the properties after all of the mixins.
    var properties = args.length ? args.splice(0, 1, {})[0] : undefined;
    var cls = extend.apply(this, args);
    mixins.forEach(function(mixin) {
      cls.reopen(mixin);
    });
    cls.reopen(properties);

    return cls;
  };
}(Class.__metaclass__.prototype.extend));

module.exports = Mixin.reopenClass({ __name__: 'Mixin' });
