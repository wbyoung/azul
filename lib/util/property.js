'use strict';

var _ = require('lodash');
var Class = require('./class');

/**
 * Property.
 *
 * @since 1.0
 * @public
 * @constructor Property
 * @param {Function} [getter] The getter to use (also sets `readable`).
 * @param {Function} [setter] The setter to use (also sets `readable`).
 * @param {Boolean} [options.readable=true] Whether the property is readable.
 * @param {Boolean} [options.writable=false] Whether the property is writable.
 */
var Property = Class.extend(/** @lends Property# */{
  init: function() {
    var args = Array.prototype.slice.call(arguments);
    var accessorArg = function(arg) {
      return arg === undefined || typeof arg === 'function';
    };
    var get = accessorArg(args[0]) ? args.shift() : undefined;
    var set = accessorArg(args[0]) ? args.shift() : undefined;
    var options = args.shift();
    this.get = get;
    this.set = set;
    this.options = options;
  }
});

/**
 * Property.
 *
 * @since 1.0
 * @public
 * @function
 * @param {Function} [getter] The getter to use (also sets `readable`).
 * @param {Function} [setter] The setter to use (also sets `readable`).
 * @param {Boolean} [options.readable=true] Whether the property is readable.
 * @param {Boolean} [options.writable=false] Whether the property is writable.
 */
var property = function() {
  return Property.create.apply(Property, arguments);
};

Property.reopenClass(/** @lends Property */{
  extend: function() { throw new Error('Cannot extend Property class'); }
});

/**
 * @namespace ClassPatching
 * @memberof Property
 * @inner
 * @private
 */

/**
 * Generic method monkey-patching.
 *
 * @memberof Property~ClassPatching
 * @type function
 * @private
 */
var patch = function(name, fn) {
  var prototype = Class.__metaclass__.prototype;
  prototype[name] = fn(prototype[name]);
};

/**
 * Shared function for supporting properties via `reopen` and `reopenClass`.
 *
 * @memberof Property~ClassPatching
 * @type function
 * @private
 */
var createProperties = function(reopen, on) {
  return function() {
    var args = Array.prototype.slice.call(arguments);

    var properties = args.shift();
    var standard = {};
    var definable = {};

    // group the properties into standard (those passed to the original reopen)
    // & definable properties (those that use defineProperty)
    _.forEach(properties, function(value, key) {
      if (value instanceof Property.__class__) {
        definable[key] = value;
      }
      else { standard[key] = value; }
    });

    // restore original properties object if there were no definable objects to
    // ensure compatibility with anything else that monkey-patches reopen
    // methods.
    if (_.size(definable) === 0) {
      standard = properties;
    }

    // use define-property on the definable ones
    _.forEach(definable, function(object, name) {
      var get = object.get;
      var set = object.set;
      var opts = _.defaults({}, object.options, {
        readable: true,
        writable: false,
        property: '_' + name
      });
      var property = opts.property;
      var standardGet = function()  { return this[property]; };
      var standardSet = function(v) { this[property] = v; };
      if (!get && opts.readable) { get = standardGet; }
      if (!set && opts.writable) { set = standardSet; }

      Object.defineProperty(this[on].prototype, name, {
        enumerable: true,
        get: get,
        set: set,
      });
    }, this);

    args.unshift(standard);

    return reopen.apply(this, args);
  };
};

/**
 * Patches {@link Class.reopen} to support property objects in the `properties`
 * argument.
 *
 * @name reopen
 * @memberof Property~ClassPatching
 * @type method
 * @private
 */
patch('reopen', _.partialRight(createProperties, '__class__'));

/**
 * Patches {@link Class.reopenClass} to support property objects in the
 * `properties` argument.
 *
 * @name reopenClass
 * @memberof Property~ClassPatching
 * @type method
 * @private
 */
patch('reopenClass', _.partialRight(createProperties, '__metaclass__'));

module.exports = _.extend(property, {
  Class: Property.reopenClass({ __name__: 'Property' })
});
