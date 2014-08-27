'use strict';

var Query = require('./query');

/**
 * Database
 *
 * Documentation forthcoming.
 */
function DB(adapter) {
  this._adapter = adapter;
}

/**
 * Select
 *
 * Documentation forthcoming.
 */
DB.prototype.select = function() {
  var query = new Query(this._adapter);
  return query.select.apply(query, arguments);
};

module.exports = DB;
