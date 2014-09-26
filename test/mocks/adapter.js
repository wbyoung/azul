'use strict';

var Adapter = require('../../lib/db/adapters/base');

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
var MockAdapter = Adapter.extend();

/**
 * Connect for MockAdapter
 *
 * @method
 * @private
 * @see {Adapter#connect}
 */
MockAdapter.prototype.connect = function(connection, cb) {
  setTimeout(cb, 0);
};

module.exports = MockAdapter;
