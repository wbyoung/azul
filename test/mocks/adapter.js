'use strict';

var BluebirdPromise = require('bluebird');
var Adapter = require('../../lib/db/adapters/base');

/**
 * Mock adapter for testing.
 *
 * @since 1.0
 * @public
 * @constructor
 * @extends Adapter
 */
var MockAdapter = Adapter.extend(/** @lends MockAdapter# */ {

  /**
   * Connect for MockAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_connect}
   */
  _connect: BluebirdPromise.method(function() {
    function MockAdapterClient() {}
    return new MockAdapterClient();
  }),

  /**
   * Disconnect for MockAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_disconnect}
   */
  _disconnect: BluebirdPromise.method(function(/*client*/) {
  }),

  /**
   * Execute for MockAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_execute}
   */
  _execute: BluebirdPromise.method(function(/*client, sql, args*/) {
    return {
      rows: [],
      fields: [],
      command: 'MOCK'
    };
  })

});

module.exports = MockAdapter.reopenClass({ __name__: 'MockAdapter' });
