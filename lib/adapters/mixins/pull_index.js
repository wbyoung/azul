'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');

/**
 * Mixin for create table procedure pulling out the add index as a separate
 * query when needed.
 *
 * @protected
 * @mixin PullIndexProcedure
 */
module.exports = Mixin.create(/** @lends PullIndexProcedure */ {

  /**
   * Override of {@link Procedure#createTable}.
   *
   * @method
   * @public
   * @see {@link Procedure#createTable}.
   */
  createTable: function(data) {
    if (data.indexes.length === 0) { return undefined; }

    return this._inTransaction(true, function(query) {
      var createTable = this._phrasing.createTable.bind(this._phrasing);
      var statement = createTable(_.extend({}, data, { indexes: [] }));
      var promise = query.raw(statement);

      data.indexes.forEach(function(index) {
        var createIndex = this._phrasing.createIndex(data.name, index);
        promise = promise.then(function() {
          return query.raw(createIndex.sql, createIndex.args);
        });
      }, this);

      return promise;
    }.bind(this));
  },

});
