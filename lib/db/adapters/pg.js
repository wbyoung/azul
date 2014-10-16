'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var pg = BluebirdPromise.promisifyAll(require('pg'));
BluebirdPromise.promisifyAll(pg.Client.prototype);

// TODO: use this to request all tables in a database
// SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
// SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';

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
   * Connect for PGAdapter.
   *
   * @method
   * @private
   * @see {Adapter#connect}
   */
  connect: BluebirdPromise.method(function() {
    var connection = this._connection;
    connection = _.isString(connection) ? connection :
      _.pick(connection, 'user', 'database', 'password', 'port', 'host', 'ssl');

    // TODO: use a single client here so that we're not using pooling from pg
    return pg.connectAsync(connection).spread(function(client, done) {
      return {
        client: client,
        done: done
      };
    });
  }),

  /**
   * Disconnect for PGAdapter.
   *
   * @method
   * @private
   * @see {Adapter#disconnect}
   */
  disconnect: BluebirdPromise.method(function(details) {
    return details.done();
  }),

  /**
   * Execute for PGAdapter.
   *
   * @method
   * @private
   * @see {Adapter#execute}
   */
  execute: BluebirdPromise.method(function(sql, args) {
    var self = this;
    return BluebirdPromise.bind({}).then(function() {
      return self.pool.acquireAsync();
    })
    .then(function(details) {
      this.details = details;
      return details.client.queryAsync(sql, args);
    })
    .then(function(result) {
      return {
        rows: result.rows,
        fields: _.map(result.fields, 'name'),
        command: result.command
      };
    })
    .finally(function() {
      return self.pool.release(this.details);
    });
  })

});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
