'use strict';

var Query = require('./query');

/**
 * Database
 *
 * TODO: Document
 */
function DB(adapter) {
  this._adapter = adapter;
}

/**
 * Select
 *
 * TODO: Document
 */
DB.prototype.select = function() {
  var query = new Query(this._adapter);
  return query.select.apply(query, arguments);
};

module.exports = DB;
