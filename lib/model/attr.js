'use strict';

var Property = require('../util/property');

/**
 * Attributes for models.
 *
 * @since 1.0
 * @public
 * @constructor Attr
 * @extends Property
 */
var Attr = Property.extend({
  init: function(column) {
    this._column = column;
    this._super({
      writable: true,
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
  _getter: function(opts) {
    var attr = this._attr(opts);
    return function() {
      return this._attrs && this._attrs[attr];
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
      this._attrs = this._attrs || {};
      // TODO: bring back dirty flag, but maybe not here
      // this._dirty = true;
      this._attrs[attr] = val;
    };
  },
});

module.exports = Attr.reopenClass({ __name__: 'Attr' });
