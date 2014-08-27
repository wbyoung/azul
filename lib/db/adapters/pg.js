'use strict';

var Adapter = require('./base');

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
function PGAdapter() {
  Adapter.apply(this, arguments);
}

PGAdapter.prototype = Object.create(Adapter.prototype);
PGAdapter.prototype.constructor = PGAdapter;

module.exports = PGAdapter;
