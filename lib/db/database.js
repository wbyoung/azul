'use strict';

var Class = require('../util/class');
var Query = require('./query');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 */
var Database = Class.extend({

  /**
   * Create a new database.
   *
   * @constructor
   */
  init: function(connection) {
    if (!connection) { throw new Error('Missing connection information.'); }

    var Adapter;
    try { Adapter = require('./adapters/' + connection.adapter); }
    catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        throw new Error('No adapter found for ' + connection.adapter);
      }
      else { throw e; }
    }
    this._adapter = new Adapter();
    this._query = new Query(this._adapter);
  }
});

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
