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
   * @protected
   * @see {Adapter#_connect}
   */
  _connect: BluebirdPromise.method(function() {
    var connection = this._connection;
    connection = _.isString(connection) ? connection :
      _.pick(connection, 'user', 'database', 'password', 'port', 'host', 'ssl');

    var client = new pg.Client(connection);
    return client.connectAsync().return(client);
  }),

  /**
   * Disconnect for PGAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_disconnect}
   */
  _disconnect: BluebirdPromise.method(function(client) {
    return client.end();
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
    .then(function(client) {
      this.client = client;
      return client.queryAsync(sql, args);
    })
    .then(function(result) {
      return {
        rows: result.rows,
        fields: _.map(result.fields, 'name'),
        command: result.command
      };
    })
    .finally(function() {
      return self.pool.release(this.client);
    });
  })

});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
