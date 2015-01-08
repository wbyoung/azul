'use strict';

var _ = require('lodash');
var Property = require('../util/property');

_.str = require('underscore.string');

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
   * @param {String} string The name being while this property is being defined
   * on a class.
   */
  _attr: function(name) {
    return this._column || _.str.underscored(name);
  },

  /**
   * Override of {@link Property#_init}.
   *
   * @method
   * @protected
   * @see {@link Property#_init}
   */
  _init: function(opts) {
    var attr = this._attr(opts.name);
    return function() {
      this._super.apply(this, arguments);
      this._attrs[attr] = (this._attrs[attr] !== undefined) ?
        this._attrs[attr] : undefined;
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
    var attr = this._attr(opts.name);
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
    var attr = this._attr(opts.name);
    return function(val) {
      this.setAttribute(attr, val);
    };
  },

  /**
   * Override of {@link AttributeTrigger#invoke}. Adds an additional attribute
   * to look up the database attribute value.
   *
   * @method
   * @public
   * @see {@link AttributeTrigger#invoke}
   */
  invoke: function(name, reopen/*, details*/) {
    var attr = this._attr(name);
    var property = Property.create(function() { return attr; });
    var lookup = _.object([[name + 'Attr', property]]);
    reopen(lookup);
    this._super.apply(this, arguments);
  }

});

module.exports = Attr.reopenClass({ __name__: 'Attr' });
