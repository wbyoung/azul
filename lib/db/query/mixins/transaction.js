'use strict';

var Mixin = require('../../../util/mixin');

/**
 * Transaction support for queries.
 *
 * @mixin Transaction
 */
module.exports = Mixin.create(/** @lends Transaction */{
  init: function() {
    this._super.apply(this, arguments);
  },

  _dup: function() {
    var dup = this._super();
    return dup;
  }
});
