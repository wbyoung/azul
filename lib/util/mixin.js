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
var Mixin = Class.extend(/** @lends Mixin# */{
  init: function() {
    // create an object with a hidden `__all__` property to contain the
    // arguments and extend that object so it looks like the first set of
    // properties that were given to the mixin.
    var args = Array.prototype.slice.call(arguments);
    var F = function() {};
    F.prototype = Object.create(this.__class__.prototype);
    F.prototype.__all__ = args;
    return _.extend(new F(), args[0]);
  },

  __mixins__: function() {
    return this.__all__.reduce(function(all, mixin) {
      return mixin instanceof Mixin.__class__ ?
        all.concat(mixin.__mixins__()) :
        all.concat([mixin]);
    }, []);
  }
});

Mixin.reopenClass(/** @lends Mixin */{
  extend: function() { throw new Error('Cannot extend Mixin class'); }
});

/**
 * @namespace ClassPatching
 * @memberof Mixin
 * @inner
 * @private
 */

/**
 * Patches {@link Class.reopen} to support mixins as the `properties`
 * argument.
 *
 * @name reopen
 * @memberof Mixin~ClassPatching
 * @type method
 * @private
 */

/**
 * Patches {@link Class.reopenClass} to support mixins as the `properties`
 * argument.
 *
 * @name reopenClass
 * @memberof Mixin~ClassPatching
 * @type method
 * @private
 */
['reopen', 'reopenClass'].forEach(function(reopenName) {
  var prototype = Class.__metaclass__.prototype;
  var reopen = prototype[reopenName];

  prototype[reopenName] = function() {
    var args = Array.prototype.slice.call(arguments);

    var properties = args.shift();
    if (properties instanceof Mixin.__class__) {
      properties.__mixins__().forEach(function(mixin) {
        reopen.call(this, mixin);
      }, this);
      properties = {};
    }
    args.unshift(properties);

    return reopen.apply(this, args);
  };
});

/**
 * Patches {@link Class.extend} to support an arbitrary number of mixins as
 * initial args.
 *
 * @name extend
 * @memberof Mixin~ClassPatching
 * @type method
 * @private
 */
Class.__metaclass__.prototype.extend = (function(extend) {
  return function() {
    var args = Array.prototype.slice.call(arguments);

    var mixins = [];
    while (args[0] instanceof Mixin.__class__) {
      mixins.push(args.shift());
    }

    var properties = args.shift();
    var mixin = Mixin.create.apply(Mixin, mixins.concat(properties));
    args.unshift(mixin);

    return extend.apply(this, args);
  };
}(Class.__metaclass__.prototype.extend));

module.exports = Mixin.reopenClass({ __name__: 'Mixin' });
