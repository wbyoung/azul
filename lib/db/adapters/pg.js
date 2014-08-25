'use strict';

var Adapter = require('./base');

/**
 * Postgres Adapter
 *
 * TODO: Document
 */
function PGAdapter() {
  Adapter.apply(this, arguments);
}

PGAdapter.prototype = Object.create(Adapter.prototype);
PGAdapter.prototype.constructor = PGAdapter;

module.exports = PGAdapter;
