'use strict';

var BluebirdPromise = require('bluebird');
var Adapter = require('../../lib/db/adapters/base');

var sequence = 0;
function FakeAdapterClient() { this.id = sequence++; }

/**
 * Mock adapter for testing.
 *
 * @since 1.0
 * @public
 * @constructor
 * @extends Adapter
 */
var FakeAdapter = Adapter.extend(/** @lends FakeAdapter# */ {

  /**
   * Connect for FakeAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_connect}
   */
  _connect: BluebirdPromise.method(function() {
    return new FakeAdapterClient();
  }),

  /**
   * Disconnect for FakeAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_disconnect}
   */
  _disconnect: BluebirdPromise.method(function(/*client*/) {
  }),

  /**
   * Execute for FakeAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_execute}
   */
  _execute: BluebirdPromise.method(function(/*client, sql, args*/) {
    return {
      rows: [],
      fields: []
    };
  })

});

module.exports = FakeAdapter.reopenClass({ __name__: 'FakeAdapter' });
