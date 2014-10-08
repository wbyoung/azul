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

    return pg.connectAsync(connection).spread(function(client, done) {
      return {
        client: client,
        done: done
      };
    });
  }),

  /**
   * Disconnect for PGAdapter
   *
   * @method
   * @private
   * @see {Adapter#disconnect}
   */
  disconnect: BluebirdPromise.method(function(/*details*/) {
    return details.done();
  })

});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
