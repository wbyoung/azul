'use strict';

var BluebirdPromise = require('bluebird');
var Class = require('../util/class');
var Query = require('./query');

/**
 * @since 1.0
 * @public
 * @constructor
 */
var Database = Class.extend(/** @lends Database# */{

  /**
   * Create a new database.
   *
   * @alias Database
   * @param {Object} connection The connection information.
   * @param {String} connection.adapter The adapter to use. Possible choices
   * are:
   *   - pg
   *   - mysql
   *   - sqlite
   * @param {String} connection.database The database to connect to.
   * @param {String} connection.username The username to connect with.
   * @param {String} connection.password The password to connect with.
   */
  init: function(connection) {
    if (!connection) { throw new Error('Missing connection information.'); }

    var Adapter;
    if (connection.adapter && typeof connection.adapter.__class__ === 'function') {
      Adapter = connection.adapter;
    }
    if (!Adapter) {
      try { Adapter = require('./adapters/' + connection.adapter); }
      catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new Error('No adapter found for ' + connection.adapter);
        }
        else { throw e; }
      }
    }
    this._adapter = Adapter.create();
    this._query = Query.create(this._adapter);

    this._ready = BluebirdPromise.bind(this)
    .then(function() {
      return this._adapter.connect(connection);
    })
    .then(function() { return this; });
  },

  /**
   * Ensure the database is ready.
   *
   * @return {Promise} A promise that resolves with the database instance
   * when the database is fully connected.
   */
  ready: function() {
    return this._ready;
  },

  /**
   * Disconnect from the database.
   *
   * @return {Promise} A promise indicating that the database has been
   * disconnected.
   */
  disconnect: function() {
    return this._adapter.disconnect();
  }
});

/**
 * Documentation forthcoming.
 *
 * @private
 * @function Database~query
 */
var query = function(name) {
  return function() {
    return this._query[name].apply(this._query, arguments);
  };
};

Database.reopen(/** @lends Database# */{
  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  select: query('select')
});

module.exports = Database.reopenClass({ __name__: 'Database' });
