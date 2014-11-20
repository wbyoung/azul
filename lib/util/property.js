'use strict';

var _ = require('lodash');
var AttributeTrigger = require('./attribute_trigger');

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
var Property = AttributeTrigger.extend(/** @lends Property# */{
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
  },

  invoke: function(name, reopen, prototype) {
    var get = this.get;
    var set = this.set;
    var opts = _.defaults({}, this.options, {
      readable: true,
      writable: false,
      property: '_' + name
    });
    var property = opts.property;
    var standardGet = function()  { return this[property]; };
    var standardSet = function(v) { this[property] = v; };
    if (!get && opts.readable) { get = standardGet; }
    if (!set && opts.writable) { set = standardSet; }

    Object.defineProperty(prototype, name, {
      enumerable: true,
      get: get,
      set: set,
    });
  }
});

Property.reopenClass({

  /**
   * A function that will allow creation of a property without having to use
   * {@link Class.create}.
   *
   * @type {Function} A function that will create the property.
   */
  fn: Property.create(function() {
    return this.create.bind(this);
  })
});

module.exports = Property.reopenClass({ __name__: 'Property' });
