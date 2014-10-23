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
    var args = Array.prototype.slice.call(arguments);
    // create an object with a hidden `__all__` property to contain the
    // arguments and extend that object so it looks like the first set of
    // properties that were given to the mixin.
    this.__defineHiddenProperties__();
    this.__all__ = args.filter(_.identity);
    _.extend(this, args[0]);
  },

  __defineHiddenProperties__: function() {
    var attrs = { enumerable: false, writable: true };
    Object.defineProperty(this, '__all__', attrs);
    Object.defineProperty(this, '__hidden__', attrs);
  },

  /**
   * Create a flattened array of properties are required to be mixed into a
   * class in the order in which they should be mixed in.
   *
   * @private
   * @method
   * @return {Array.<Object>} The properties
   */
    __flatten__: function() {
    return this.__all__.reduce(function(all, mixin) {
      return mixin instanceof Mixin.__class__ ?
        all.concat(mixin.__flatten__()) :
        all.concat([mixin]);
    }, []);
  },

  /**
   * Create a flattened array of all mixin objects (including this object)
   * that compose this mixin.
   *
   * The difference between this and {@link-to __flatten__} is that this will
   * only include Mixin objects while `__flatten__` will include any properties
   * that will be mixed in.
   *
   * @private
   * @method
   * @return {Array.<Mixin>} The mixins
   */
  __mixins__: function() {
    var dependencies = this.__all__.reduce(function(all, mixin) {
      return mixin instanceof Mixin.__class__ ?
        all.concat(mixin.__mixins__()) :
        all;
    }, [])
    return dependencies
      .concat(this.__hidden__ ? [] : [this]);
  },
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
 * Generic method monkey-patching.
 *
 * @memberof Mixin~ClassPatching
 * @type function
 * @private
 */
var patch = function(name, fn) {
  var prototype = Class.__metaclass__.prototype;
  prototype[name] = fn(prototype[name]);
};

/**
 * Shared function for supporting mixins via `reopen` and `reopenClass`.
 *
 * @memberof Mixin~ClassPatching
 * @type function
 * @private
 */
var applyMixins = function(reopen) {
  return function() {
    var args = Array.prototype.slice.call(arguments);

    var properties = args.shift();
    if (properties instanceof Mixin.__class__) {
      properties.__flatten__().forEach(function(mixin) {
        reopen.call(this, mixin);
      }, this);
      properties = {};
    }
    args.unshift(properties);

    return reopen.apply(this, args);
  };
};

/**
 * Patches {@link Class.reopen} to support mixins as the `properties`
 * argument.
 *
 * @name reopen
 * @memberof Mixin~ClassPatching
 * @type method
 * @private
 */
patch('reopen', applyMixins);

/**
 * Patches {@link Class.reopenClass} to support mixins as the `properties`
 * argument.
 *
 * @name reopenClass
 * @memberof Mixin~ClassPatching
 * @type method
 * @private
 */
patch('reopenClass', applyMixins);

/**
 * Patches {@link Class.reopen} to support `__mixins__` as a property on the
 * class object.
 *
 * @name reopen for __mixin__
 * @memberof Mixin~ClassPatching
 * @type method
 * @private
 */
patch('reopen', function(reopen) {
  return function() {
    var meta = this.__identity__.__metaclass__.prototype;
    var properties = arguments[0];
    if (properties instanceof Mixin.__class__) {
      meta.__mixins__ = meta.__mixins__.concat(properties.__mixins__());
    }
    return reopen.apply(this, arguments);
  };
});
Class.__metaclass__.prototype.__mixins__ = []; // default value

/**
 * Patches {@link Class.extend} to support an arbitrary number of mixins as
 * initial args.
 *
 * @name extend
 * @memberof Mixin~ClassPatching
 * @type method
 * @private
 */
patch('extend', function(extend) {
  return function() {
    var args = Array.prototype.slice.call(arguments);

    var mixins = [];
    while (args[0] instanceof Mixin.__class__) {
      mixins.push(args.shift());
    }

    mixins.unshift({ extended: true });

    var properties = args.shift();
    var mixin = Mixin.create.apply(Mixin, mixins.concat(properties));
    mixin.__hidden__ = true;
    args.unshift(mixin);

    return extend.apply(this, args);
  };
});

module.exports = Mixin.reopenClass({ __name__: 'Mixin' });
