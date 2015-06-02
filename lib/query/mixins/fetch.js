'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');

/**
 * Fetch support for queries.
 *
 * @mixin Fetch
 */
module.exports = Mixin.create(/** @lends Fetch# */ {

  /**
   * This executes the query and returns an array.
   *
   * When no transform has been added via {@link Transform#transform}, this
   * will get the `rows` from the result. If a transform has been used, it will
   * ensure that the transform has resulted in an array or reject the resulting
   * promise.
   *
   * @method
   * @public
   * @return {Promise} A promise that will resolve with an array.
   */
  fetch: function() {
    var transformed = this._transforms && this._transforms.length;
    return this.execute().then(function(result) {
      if (!transformed) { result = result.rows; }
      if (transformed && !_.isArray(result)) {
        throw new Error('Transforms prior to fetch did not produce an array.');
      }
      return result;
    });
  },

  /**
   * Fetch a single result or reject if exactly one object was not found.
   *
   * @method
   * @public
   * @see {@link Fetch#fetch}
   * @return {Promise}
   * @return {Promise} A promise that will resolve with a single item.
   */
  fetchOne: function() {
    return this.fetch().then(function(results) {
      var error;
      if (results.length === 0) {
        error = _.extend(new Error('No results found.'), {
          code: 'NO_RESULTS_FOUND',
        });
      }
      if (results.length > 1) {
        error = _.extend(new Error('Multiple results found.'), {
          code: 'MULTIPLE_RESULTS_FOUND',
        });
      }

      if (error) {
        var statement = this.statement;
        throw _.extend(error, {
          query: this,
          sql: statement.sql,
          args: statement.args
        });
      }

      return results[0];
    }.bind(this));
  }

});
