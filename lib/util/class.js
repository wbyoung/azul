'use strict';

var _ = require('lodash');
var construct = require('./construct');

var Class = function() {};
var classMethods = {};

/**
 * Documentation forthcoming.
 *
 * @name Class.extend
 * @since 1.0
 * @public
 * @method
 * @param {Object} properties Properties to add to the new class's prototype.
 */
classMethods.extend = function(properties) {
  var parent = this;
  var init = properties && properties.init;
  var child = function() {
    if (!(this instanceof child)) { return construct(child, arguments); }
    parent.apply(this, arguments);
    if (init) { return init.apply(this, arguments); }
  };
  child.prototype = Object.create(parent.prototype);
  child.prototype.constructor = child;
  child.__super__ = parent.prototype;
  _.extend(child, classMethods);
  _.extend(child.prototype, properties);
  return child;
};

/**
 * Define an accessor. This will define a property that reads and/or writes to
 * a private instance variable.
 *
 * @param {String} name The name of the accessor.
 * @param {Boolean} [options.readable=true] Whether the property is readable.
 * @param {Boolean} [options.writable=false] Whether the property is writable.
 */
classMethods.defineAccessor = function(name, options) {
  var cls = this;
  var opts = _.defaults({}, options, {
    readable: true,
    writable: false,
    property: '_' + name
  });
  var property = opts.property;

  Object.defineProperty(cls.prototype, name, {
    enumerable: true,
    get: opts.readable ? function()  { return this[property]; } : undefined,
    set: opts.writable ? function(v) { this[property] = v; }    : undefined,
  });
};

module.exports = _.extend(Class, classMethods);
