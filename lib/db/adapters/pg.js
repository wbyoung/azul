'use strict';

var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var pg = BluebirdPromise.promisifyAll(require('pg'));

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
var PGAdapter = Adapter.extend(/** @lends PGAdapter# */ {

  /**
   * Connect for PGAdapter
   *
   * @method
   * @private
   * @see {Adapter#connect}
   */
  connect: function(connection) {
    // TODO: real connection string
    var string = 'postgres://root@localhost/agave_test';
    return pg.connectAsync(string)
    .bind(this)
    .spread(function(client, done) {
      this._client = client;
      this._done = done;
    });
  },

  /**
   * Disconnect for PGAdapter
   *
   * @method
   * @private
   * @see {Adapter#disconnect}
   */
  disconnect: function() {
    return BluebirdPromise.resolve(this._done());
  }

});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
