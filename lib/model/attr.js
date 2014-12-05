'use strict';

var _ = require('lodash');
var Property = require('../util/property');

/**
 * Attributes for models.
 *
 * @since 1.0
 * @public
 * @constructor Attr
 * @extends Property
 * @param {String} column The column name for which this is an attribute.
 * @param {Object} [options] Options.
 * @param {Object} [options.writable] Whether this attribute is writable.
 * Defaults to true.
 */
var Attr = Property.extend({
  init: function(column, options) {
    var opts = _.defaults({}, options, { writable: true });
    this._column = column;
    this._super({
      writable: opts.writable,
      property: column
    });
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @function
   */
  _attr: function(opts) {
    return this._column || opts.name;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @function
   */
  _init: function(opts) {
    var attr = this._attr(opts);
    return function() {
      this._super.apply(this, arguments);
      this._attrs[attr] = this._attrs[attr] || undefined;
    };
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @function
   */
  _getter: function(opts) {
    var attr = this._attr(opts);
    return function() {
      return this.getAttribute(attr);
    };
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @function
   */
  _setter: function(opts) {
    var attr = this._attr(opts);
    return function(val) {
      this.setAttribute(attr, val);
    };
  }

});

module.exports = Attr.reopenClass({ __name__: 'Attr' });
