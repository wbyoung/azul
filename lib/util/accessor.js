'use strict';

var _ = require('lodash');

/**
 * Define an accessor. This will define a property that reads and/or writes to
 * a private instance variable.
 *
 * @param {Class} cls The class on which to define the accessor.
 * @param {String} name The name of the accessor.
 * @param {Boolean} [options.readable=true] Whether the property is readable.
 * @param {Boolean} [options.writable=false] Whether the property is writable.
 */
var defineAccessor = function(cls, name, options) {
  var opts = _.extend({}, options, {
    readable: true,
    writable: false
  });
  var property = '_' + name;

  Object.defineProperty(cls.prototype, name, {
    enumerable: true,
    get: opts.readable ? function()  { return this[property]; } : undefined,
    set: opts.writable ? function(v) { this[property] = v; }    : undefined,
  });
};

module.exports = defineAccessor;
