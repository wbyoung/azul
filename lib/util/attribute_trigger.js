'use strict';

var _ = require('lodash');
var Class = require('./class');

/**
 * AttributeTrigger.
 *
 * @public
 * @constructor AttributeTrigger
 */
var AttributeTrigger = Class.extend(/** @lends AttributeTrigger# */ {

  /**
   * Subclasses should override this method to react to a property being added
   * to a class or metaclass.
   *
   * @param {String} name The property name.
   * @param {Function} reopen The reopen method to call to add additional
   * properties. This will add properties either to the class or metaclass
   * depending on where the property is being used.
   * @param {Object} details Details about the context in which the attribute
   * is being added.
   * @param {Object} details.context The object to which the property is being
   * added (either a class or metaclass).
   * @param {Object} details.prototype The prototype on which this property is
   * being added. You should avoid using this if possible and instead use the
   * reopen function to add new properties, but certain operations may require
   * direct access to the prototype.
   * @param {Object} details.properties All of the properties, unmodified, that
   * are being defined during this addition of properties to a class or
   * metaclass (through `reopen` or `reopenClass`).
   */
  invoke: function(/*name, reopen, details*/) {
    throw new Error('The `invoke` method must be implemented by subclass');
  }
});

/**
 * @namespace ClassPatching
 * @memberof AttributeTrigger
 * @inner
 * @private
 */

/**
 * Generic method monkey-patching.
 *
 * @memberof AttributeTrigger~ClassPatching
 * @type function
 * @private
 */
var patch = function(name, fn) {
  var prototype = Class.__metaclass__.prototype;
  prototype[name] = fn(prototype[name], name);
};

/**
 * Shared function for supporting properties via `reopen` and `reopenClass`.
 *
 * @memberof AttributeTrigger~ClassPatching
 * @type function
 * @private
 * @param {Function} reopen The original reopen function to call to complete
 * the `reopen` or `reopenClass` process.
 * @param {String} kind The name of the method being patched (either `reopen`
 * or `reopenClass`).
 * @param {String} on The name of the property that contains the constructor
 * for the prototype (either `__class__` or `__metaclass__`).
 */
var createTriggers = function(reopen, kind, on) {
  return function() {
    var args = _.toArray(arguments);
    var properties = args.shift();
    var standard = {};
    var triggers = {};

    // this allows the attribute-trigger subclass to add more attributes of the
    // same kind by simply calling this `reopen` function. the subclass does
    // not need to worry about whether it's adding instance or static/class
    // attributes, they'll just be added to the same area as the trigger was.
    var boundReopen = this[kind].bind(this);

    // group the properties into standard (those passed to the original reopen)
    // & trigger properties.
    _.forEach(properties, function(value, key) {
      if (value instanceof AttributeTrigger.__class__) {
        triggers[key] = value;
      }
      else { standard[key] = value; }
    });

    // restore original properties object if there were no definable objects to
    // ensure compatibility with anything else that monkey-patches reopen
    // methods.
    if (_.size(triggers) === 0) {
      standard = properties;
    }

    args.unshift(standard);

    var result = reopen.apply(this, args);

    // invoke each trigger
    _.forEach(triggers, function(trigger, name) {
      trigger.invoke(name, boundReopen, {
        context: this,
        properties: properties,
        prototype: this[on].prototype
      });
    }, this);

    return result;
  };
};

/**
 * Patches {@link Class.reopen} to support trigger objects in the `properties`
 * argument.
 *
 * @name reopen
 * @memberof AttributeTrigger~ClassPatching
 * @type method
 * @private
 */
patch('reopen', _.partialRight(createTriggers, '__class__'));

/**
 * Patches {@link Class.reopenClass} to support trigger objects in the
 * `properties` argument.
 *
 * @name reopenClass
 * @memberof AttributeTrigger~ClassPatching
 * @type method
 * @private
 */
patch('reopenClass', _.partialRight(createTriggers, '__metaclass__'));

module.exports = AttributeTrigger.reopenClass({ __name__: 'AttributeTrigger' });
