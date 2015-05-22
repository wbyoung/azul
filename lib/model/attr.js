'use strict';

var _ = require('lodash');
var Property = require('../util/property');

/**
 * Generate closure around calculation of attributes.
 *
 * @function Attr~attrs
 * @private
 * @return {Function}
 */
var attrs = function() {

  // walk the class hierarchy (with reduce-like functionality)
  var walk = function(cls, fn, val) {
    while (cls) {
      val = fn(cls, val);
      cls = cls.__super__;
    }
    return val;
  };

  // find all attrs in the class
  var find = function(cls) {
    var prototype = cls.__class__.prototype;
    return _(prototype).keys().map(function(key) {
      var name = _.get(key.match(/(.*)Attr$/), 1);
      return name && { name: name, dbattr: prototype[key] };
    }).filter().value();
  };

  // return the function with the value locked in
  return _.once(function() {
    var attrs = walk(this, function(cls, attrs) {
      return find(cls).concat(attrs);
    }, []);
    return _(attrs).uniq('dbattr').pluck('name').value();
  });

};

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
    this._super(_.pick(opts, 'writable'));
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
    return this._column || _.snakeCase(name);
  },

  /**
   * General attribute initialization method that overrides
   * {@link Model#_initAttributes} on the model this is mixed into. This calls
   * super & then calls the custom attribute initializer.
   *
   * @method
   * @protected
   * @see {@link Model#_initAttributes}
   * @see {@link Attr#_init}
   */
  _initAttributes: function(opts) {
    var initName = opts.name + 'Init';
    return function() {
      this._super.apply(this, arguments);
      this[initName].apply(this, arguments);
    };
  },

  /**
   * Custom attribute initializer that will be mixed in as `init<Name>`. This
   * simply initializes the attribute to `undefined`. It may be overridden by
   * model classes to change the default value of a property. Any changes made
   * during this method will not make the model dirty.
   *
   * @method
   * @protected
   * @see {@link Model#_initAttributes}
   * @see {@link Attr#_init}
   */
  _init: function(opts) {
    var attr = this._attr(opts.name);
    return function() {
      this.setAttribute(attr, undefined);
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
   * Override of {@link AttributeTrigger#invoke}. Adds an additional attributes
   * initialize the attribute and to look up the database attribute value.
   *
   * @method
   * @public
   * @see {@link AttributeTrigger#invoke}
   */
  invoke: function(name, reopen, details) {
    var opts = { name: name };
    var attr = this._attr(name);
    var attrName = name + 'Attr';
    var initName = name + 'Init';

    var properties = { _initAttributes: this._initAttributes(opts) };
    properties[attrName] = Property.create(function() { return attr; });
    properties[initName] = this._init(opts);
    reopen(properties);

    // add a new copy of the attrs function since the attributes have changed
    // on this model & they'll need to be recalculated.
    details.context.__identity__.reopenClass({
      _attrs: attrs()
    });

    this._super.apply(this, arguments);
  }

});

module.exports = Attr.reopenClass({ __name__: 'Attr' });
