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
  this._query = new Query(this._adapter);
}

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @private
 * @function query
 */
var query = function(name) {
  return function() {
    return this._query[name].apply(this._query, arguments);
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method select
 */
Database.prototype.select = query('select');

module.exports = Database;
