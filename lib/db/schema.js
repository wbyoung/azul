'use strict';

var BluebirdPromise = require('bluebird');
var Class = require('../util/class');
var Condition = require('./condition'), w = Condition.w;

var CreateTableQuery = Class.extend(/** @lends CreateTableQuery# */{
  init: function(adapter, name, cb) {
    this._adapter = adapter;
    this._name = name;
    this._columns = this._extractColumns(cb);
    this._promise = new BluebirdPromise(function(resolve, reject) {
      this._resolve = resolve;
      this._reject = reject;
    }.bind(this));
  },

  /**
   * Extract columns from the callback.
   *
   * @private
   * @return {Array} The column information.
   */
  _extractColumns: function(cb) {
    // TODO: handle more types & options
    var columns = [];
    var callables = {
      string: function(name) { columns.push({ name: name, type: 'string' }); }
    };
    cb(callables);
    return columns;
  },

  /**
   * Generate SQL for a query.
   *
   * @see {Query#sql}.
   */
  sql: function() {
    return this._adapter.phrasing.createTable({
      name: this._name,
      columns: this._columns
    });
  },

  /**
   * Execute the query.
   *
   * @return {Promise} A promise that will resolve when execution is complete.
   */
  execute: function() {
    // TODO: contact the adapter and execute the query. reject/resolve based on
    // that.
    return this._promise;
  },

  /**
   * {@link Schema} is a _thenable_ object.
   *
   * @see {Query#then}.
   */
  then: function(fulfilledHandler, rejectedHandler) {
    this.execute();
    return this._promise.then(fulfilledHandler, rejectedHandler);
  }
});

CreateTableQuery.reopenClass({ __name__: 'CreateTableQuery' });

/**
 * Queries are the building block of Agave's schema migration layer. They
 * are are a slightly less flexible version of the {@link Query} object. For
 * instance, they're not immutable and chainable. Instead, they expose a suite
 * of functionality that allows schema manipulation.
 *
 * Generally, you will not create a schema object directly. Instead, you will
 * receive a schema object via the {@link Database}.
 *
 * @since 1.0
 * @protected
 * @constructor
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var Schema = Class.extend(/** @lends Schema# */{
  init: function(adapter) {
    this._adapter = adapter;
  },

  createTable: function(name, cb) {
    return CreateTableQuery.create(this._adapter, name, cb);
  }
});


module.exports = Schema.reopenClass({ __name__: 'Schema' });
