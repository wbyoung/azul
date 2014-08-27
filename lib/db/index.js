'use strict';

var Query = require('./query');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @class Database
 * @constructor
 */
function Database(adapter) {
  this._adapter = adapter;
}

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method select
 */
Database.prototype.select = function() {
  var query = new Query(this._adapter);
  return query.select.apply(query, arguments);
};

module.exports = Database;
