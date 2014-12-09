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
  },

  /**
   * Fetch a single result or reject if exactly one object was not found.
   *
   * @method
   * @public
   */
  fetchOne: function() {
    return this.execute().then(function(results) {
      if (results.length !== 1) {
        throw new Error('Expected one result');
      }
      return results[0];
    });
  }

});
