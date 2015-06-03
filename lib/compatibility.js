'use strict';

/**
 * Validate compatibility with other modules.
 *
 * @private
 * @function validateCompatibility
 */
module.exports = function() {
  var BaseQuery = require('maguey').BaseQuery;
  var Class = require('corazon').Class;
  if (!(BaseQuery instanceof Class.__metaclass__)) {
    throw new Error('Incompatible base class between `azul` and `maguey`.');
  }
};
