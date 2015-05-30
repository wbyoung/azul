'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var Adapter = require('../base');
var pg = Promise.promisifyAll(require('pg'));
Promise.promisifyAll(pg.Client.prototype);


// NOTE: use this to request all tables in a database
// SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
// SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';

/**
 * PostgreSQL Adapter.
 *
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
   * @see {@link Adapter#_connect}
   */
  _connect: Promise.method(function() {
    var client = new pg.Client(this._connection);
    return client.connectAsync().return(client);
  }),

  /**
   * Disconnect for PGAdapter.
   *
   * @method
   * @protected
   * @see {@link Adapter#_disconnect}
   */
  _disconnect: Promise.method(function(client) {
    return client.end();
  }),

  /**
   * Execute for PGAdapter.
   *
   * @method
   * @private
   * @see {@link Adapter#_execute}
   */
  _execute: Promise.method(function(client, sql, args) {
    return Promise.bind({})
    .then(function() {
      return client.queryAsync(sql, args);
    })
    .then(function(result) {
      return {
        client: client,
        rows: result.rows,
        fields: _.map(result.fields, 'name')
      };
    });
  })

});

PGAdapter.reopenClass(/** @lends PGAdapter */ {
  Grammar: require('./grammar'),
  Translator: require('./translator'),
  Procedures: require('./procedures'),
});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
