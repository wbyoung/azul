'use strict';

var BluebirdPromise = require('bluebird');
var Adapter = require('../../lib/db/adapters/base');

/**
 * Postgres Adapter
 *
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 * @extends Adapter
 */
var MockAdapter = Adapter.extend(/** @lends MockAdapter# */ {

  /**
   * Connect for MockAdapter
   *
   * @method
   * @private
   * @see {Adapter#connect}
   */
  connect: BluebirdPromise.method(function(/*connection*/) {
    function MockAdapterClient() {}
    return new MockAdapterClient();
  }),

  /**
   * Disconnect for MockAdapter
   *
   * @method
   * @private
   * @see {Adapter#disconnect}
   */
  disconnect: BluebirdPromise.method(function(/*details*/) {
  })

});

module.exports = MockAdapter;
