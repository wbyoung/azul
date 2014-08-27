'use strict';

var Query = require('./query');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @class DB
 * @constructor
 */
function DB(adapter) {
  this._adapter = adapter;
}

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method select
 */
DB.prototype.select = function() {
  var query = new Query(this._adapter);
  return query.select.apply(query, arguments);
};

module.exports = DB;
