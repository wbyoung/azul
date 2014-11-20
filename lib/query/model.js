'use strict';

var BoundQuery = require('./bound');
var SelectQuery = require('./select');
var BluebirdPromise = require('bluebird');

/**
 * A query bound to a specific model class.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#bindModel}.
 *
 * @since 1.0
 * @protected
 * @constructor ModelQuery
 * @extends BoundQuery
 */
var ModelQuery = BoundQuery.extend(/** @lends ModelQuery# */{
  init: function() { throw new Error('ModelQuery must be spawned.'); },

  _create: function(model) {
    this._super(model.tableName);
    this._model = model;
    this._prefetches = [];
  },

  _take: function(orig) {
    this._super(orig);
    this._model = orig._model;
    this._prefetches = orig._prefetches;
  },

  _spawn: function(type) {
    if (this._prefetches.length) {
      this._validateSpawn(type, 'with', [SelectQuery]);
    }
    return this._super.apply(this, arguments);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  _execute: function() {
    return this._super()
      .tap(this._prefetch.bind(this));
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  _prefetch: function(records) {
    return BluebirdPromise.map(this._prefetches, function(relation) {
      return relation.prefetch(records);
    });
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  with: function(association) {
    var dup = this._dup();
    var prototype = this._model.__class__.prototype;
    var relation = prototype[association + 'Relation'];
    dup._prefetches.push(relation);
    return dup;
  }

});

module.exports = ModelQuery.reopenClass({ __name__: 'ModelQuery' });
