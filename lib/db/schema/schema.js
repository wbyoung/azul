'use strict';

var _ = require('lodash');
var RawQuery = require('../query/raw');
var Class = require('../../util/class');

// TODO: handle more types & options
var ColumnCreator = Class.extend({
  init: function(columns) {
    this._columns = columns;
  },
  string: function(name) {
    this._columns.push({ name: name, type: 'string' });
  },
  text: function(name) {
    this._columns.push({ name: name, type: 'text' });
  },
  serial: function(name) {
    this._columns.push({ name: name, type: 'serial' });
  }
});

ColumnCreator.reopenClass({ __name__: 'Table~ColumnCreator' });

var CreateTableQuery = RawQuery.extend({
  init: function(adapter, name, cb) {
    this._name = name;
    this._columns = [];
    this._options = {
      ifNotExists: false
    };
    if (cb) {
      cb(ColumnCreator.create(this._columns));
    }
  },

  _dup: function() {
    var dup = this._super();
    dup._name = this._name;
    dup._columns = this._columns;
    dup._options = _.clone(this._options);
    return dup;
  },

  sql: function() {
    return this._adapter.phrasing.createTable({
      name: this._name,
      columns: this._columns,
      options: this._options
    });
  },

  unlessExists: function() {
    var dup = this._dup();
    dup._options.ifNotExists = true;
    return dup;
  }
});

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
    return CreateTableQuery.create(this._adapter, name, cb);
  }
});

module.exports = Schema.reopenClass({ __name__: 'Schema' });
