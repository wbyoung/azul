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
 * @param {String} [options.property] The private variable name to use (which
 * defaults to the property name with a leading underscore).
 */
var Property = AttributeTrigger.extend(/** @lends Property# */ {
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

  /**
   * Subclasses can override this to provide an initializer.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Object} options Details about the property that mirror the options
   * passed to the property constructor with the addition of a `name` value.
   */
  _init: function(/*opts*/) {
    return undefined;
  },

  /**
   * Subclasses can override this to implement their own custom getter.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Object} options Details about the property that mirror the options
   * passed to the property constructor with the addition of a `name` value.
   */
  _getter: function(opts) {
    return function() {
      return this[opts.property];
    };
  },

  /**
   * Subclasses can override this to implement their own custom setter.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Object} options Details about the property that mirror the options
   * passed to the property constructor with the addition of a `name` value.
   */
  _setter: function(opts) {
    return function(value) {
      this[opts.property] = value;
    };
  },

  /**
   * Override of {@link AttributeTrigger#invoke}.
   *
   * @since 1.0
   * @public
   * @method
   * @see {@link AttributeTrigger#invoke}
   */
  invoke: function(name, reopen, details) {
    var get = this.get;
    var set = this.set;
    var opts = _.defaults({ name: name }, this.options, {
      readable: true,
      writable: false,
      property: '_' + name
    });
    if (!get && opts.readable) { get = this._getter(opts); }
    if (!set && opts.writable) { set = this._setter(opts); }

    var init = this._init(opts);
    if (init) { reopen({ init: init }); }

    Object.defineProperty(details.prototype, name, {
      enumerable: true,
      get: get,
      set: set,
    });
  }
});

Property.reopenClass(/** @lends Property */ {

  /**
   * A function that will allow creation of a property without having to use
   * {@link Class.create}.
   *
   * @type {Function}
   */
  fn: Property.create(function() {
    return this.create.bind(this);
  })

});

module.exports = Property.reopenClass({ __name__: 'Property' });
