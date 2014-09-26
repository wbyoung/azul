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
var PGAdapter = Adapter.extend();

/**
 * Connect for PGAdapter
 *
 * @method
 * @private
 * @see {Adapter#connect}
 */
PGAdapter.prototype.connect = function(connection, cb) {
  // TODO: real connection string
  var string = 'postgres://root@localhost/agave_test';
  pg.connect(string, function(err, client, done) {
    if (err) { return cb(err); }
    this._client = client;
    this._done = done;
    cb(null);
  }.bind(this));
};

module.exports = PGAdapter;
