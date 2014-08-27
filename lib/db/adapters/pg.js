'use strict';

var Adapter = require('./base');

/**
 * Postgres Adapter
 *
 * Documentation forthcoming.
 */
function PGAdapter() {
  Adapter.apply(this, arguments);
}

PGAdapter.prototype = Object.create(Adapter.prototype);
PGAdapter.prototype.constructor = PGAdapter;

module.exports = PGAdapter;
