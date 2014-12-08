'use strict';

var _ = require('lodash');
var Property = require('../util/property');

/**
 * Attributes for models.
 *
 * @public
 * @constructor Attr
 * @extends Property
 * @param {String} column The column name for which this is an attribute.
 * @param {Object} [options] Options.
 * @param {Object} [options.writable] Whether this attribute is writable.
 * Defaults to true.
 */
var Attr = Property.extend(/** @lends Attr# */ {
  init: function(column, options) {
    var opts = _.defaults({}, options, { writable: true });
    this._column = column;
    this._super({
      writable: opts.writable,
      property: column
    });
  },

  /**
   * Convenience method to look up the attribute name.
   *
   * @method
   * @private
   * @param {Object} opts The options being used while building a
   * {@link Property#_getter} or {@link Property#_setter}.
   */
  _attr: function(opts) {
    return this._column || opts.name;
  },

  /**
   * Override of {@link Property#_init}.
   *
   * @method
   * @protected
   * @see {@link Property#_init}
   */
  _init: function(opts) {
    var attr = this._attr(opts);
    return function() {
      this._super.apply(this, arguments);
      this._attrs[attr] = this._attrs[attr] || undefined;
    };
  },

  /**
   * Override of {@link Property#_getter}.
   *
   * @method
   * @protected
   * @see {@link Property#_getter}
   */
  _getter: function(opts) {
    var attr = this._attr(opts);
    return function() {
      return this.getAttribute(attr);
    };
  },

  /**
   * Override of {@link Property#_setter}.
   *
   * @method
   * @protected
   * @see {@link Property#_setter}
   */
  _setter: function(opts) {
    var attr = this._attr(opts);
    return function(val) {
      this.setAttribute(attr, val);
    };
  }

});

module.exports = Attr.reopenClass({ __name__: 'Attr' });
