'use strict';

var _ = require('lodash');
var maguey = require('maguey');

/**
 * Names of classes that require resetting.
 *
 * These query classes are mutated by the bound query & need to be reset each
 * time tests are re-run (and only Azul.js is reloaded).
 *
 * @type {Array}
 * @see reset
 */
var restore = [
  'SelectQuery',
  'InsertQuery',
  'UpdateQuery',
  'DeleteQuery',
];

/**
 * Determine if an key is considered protected in a prototype.
 *
 * @function
 * @private
 * @param {String} key
 * @return {Boolean}
 */
var isProtected = function(key) {
  return key.match(/^__.*__$/);
};

/**
 * Clone non-protected items from a prototype.
 *
 * @function
 * @private
 * @param {Object} prototype
 * @return {Object}
 */
var clone = function(prototype) {
  prototype = _.clone(prototype);
  prototype = _.omit(prototype, _.rearg(isProtected, [1, 0]));
  return prototype;
};

/**
 * Remove non-protected items from a prototype.
 *
 * @function
 * @private
 * @param {Object} prototype
 */
var empty = function(obj) {
  _.keys(obj).filter(_.negate(isProtected)).forEach(function(key) {
    delete obj[key];
  });
};

/**
 * Reset prototypes for a subset of classes within magay.
 *
 * This is required to support mocha re-running the test suite in watch mode.
 * Mocha re-loads all of Azul.js, and Azul.js makes changes to certain classes
 * in maguey. We need the maguey classes to be pristine when the tests are
 * re-run so Azul.js isn't adding changes on top of existing changes.
 *
 * This is currently the best solution to this issue. Another way would be to
 * simply force maguey to be re-required, but then all dependencies of maguey
 * would need to be re-required as well.
 *
 * @function reset
 * @private
 */
module.exports = function() {
  // define reset before updating the reset storage so the first reset does not
  // actually do any resetting.
  var reset = maguey._azulReset;

  // store clones of class & metaclass prototypes globally when first loaded so
  // they can be used later to perform restores.
  maguey._azulReset = maguey._azulReset || _(maguey)
    .pick(restore)
    .mapValues(function(cls) {
      return {
        cls: cls,
        __class__: clone(cls.__class__.prototype),
        __metaclass__: clone(cls.__metaclass__.prototype),
      };
    })
    .value();

  _.forEach(reset, function(stored) {
    var cls = stored.cls;
    empty(cls.__class__.prototype);
    empty(cls.__metaclass__.prototype);
    _.extend(cls.__class__.prototype, stored.__class__);
    _.extend(cls.__metaclass__.prototype, stored.__metaclass__);
  });
};
