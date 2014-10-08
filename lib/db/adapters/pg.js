'use strict';

var _ = require('lodash');
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
  connect: BluebirdPromise.method(function(connection) {
    connection = _.isString(connection) ? connection :
      _.pick(connection, 'user', 'database', 'password', 'port', 'host', 'ssl');
    
    return pg.connectAsync(connection)
    .bind(this)
    .spread(function(client, done) {
      this._client = client;
      this._done = done;
    });
  }),

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
