'use strict';

var Mixin = require('../../util/mixin');

/**
 * Fetch support for queries.
 *
 * @mixin Fetch
 */
module.exports = Mixin.create(/** @lends Fetch# */ {

  /**
   * An alias for {@link BaseQuery#execute}.
   *
   * @method
   * @public
   */
  fetch: function() {
    return this.execute();
  }

});
