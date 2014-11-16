'use strict';

var _ = require('lodash');
var Class = require('./class');

/**
 * AttributeTrigger.
 *
 * @since 1.0
 * @public
 * @constructor AttributeTrigger
 */
var AttributeTrigger = Class.extend(/** @lends AttributeTrigger# */{

  /**
   * Subclasses should override this method to react to a property being added
   * to a class or metaclass.
   *
   * @param {String} name The property name.
   * @param {Function} reopen The reopen method to call to add additional
   * properties. This will add properties either to the class or metaclass
   * depending on where the property is being used.
   * @param {Object} prototype The prototype on which this property is being
   * added. You should avoid using this if possible and instead use the reopen
   * function to add new properties, but certain operations may require direct
   * access to the prototype.
   */
  invoke: function(/*name, reopen, prototype*/) {
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
 */
var createTriggers = function(reopen, name, on) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var addAttributes = this[name].bind(this);

    var properties = args.shift();
    var standard = {};
    var triggers = {};

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

    // invoke each trigger
    _.forEach(triggers, function(trigger, name) {
      trigger.invoke(name, addAttributes, this[on].prototype);
    }, this);

    args.unshift(standard);

    return reopen.apply(this, args);
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
