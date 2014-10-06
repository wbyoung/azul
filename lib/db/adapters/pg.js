'use strict';

var Adapter = require('./base');
var pg = require('pg');

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
  connect: function(connection, cb) {
    // TODO: real connection string
    // TODO: convert to promises
    var string = 'postgres://root@localhost/agave_test';
    pg.connect(string, function(err, client, done) {
      if (err) { return cb(err); }
      this._client = client;
      this._done = done;
      cb(null);
    }.bind(this));
  }

});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
