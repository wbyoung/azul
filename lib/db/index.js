'use strict';

var Query = require('./query');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 */
function Database(adapter) {
  this._adapter = adapter;
  this._query = new Query(this._adapter);
}

/**
 * Documentation forthcoming.
 *
 * @private
 * @function
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
 * @method
 */
Database.prototype.select = query('select');

module.exports = Database;
