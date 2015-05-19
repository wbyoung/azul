'use strict';

var Class = require('../util/class');


/**
 * The procedures class is responsible for complex procedures that cannot be
 * expressed in single queries.
 *
 * @public
 * @constructor
 */
var Procedures = Class.extend();

Procedures.reopen(/** @lends Procedures# */ {

  init: function (grammar, phrasing) {
    this._super();
    this._grammar = grammar;
    this._phrasing = phrasing;
  }

});

module.exports = Procedures.reopenClass({ __name__: 'Procedures' });
