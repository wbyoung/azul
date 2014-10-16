'use strict';

var RawQuery = require('./query/raw');
var Class = require('../util/class');

var createTable = function(adapter, name, cb) {
  // TODO: handle more types & options
  var columns = [];
  var callables = {
    string: function(name) { columns.push({ name: name, type: 'string' }); }
  };
  cb(callables);

  var statement = adapter.phrasing.createTable({
    name: name,
    columns: columns
  });

  return RawQuery.create(adapter, statement);
};


/**
 * Queries are the building block of Azul's schema migration layer. They
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
    return createTable(this._adapter, name, cb);
  }
});


module.exports = Schema.reopenClass({ __name__: 'Schema' });
