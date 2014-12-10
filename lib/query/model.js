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
 * @protected
 * @constructor ModelQuery
 * @extends BoundQuery
 */
var ModelQuery = BoundQuery.extend(/** @lends ModelQuery# */ {
  init: function() { throw new Error('ModelQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @param {Class} model The model class to lock in / bind to this query.
   * @see {@link BaseQuery#_create}
   */
  _create: function(model) {
    this._super(model.tableName);
    this._model = model;
    this._prefetches = [];
  },

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._model = orig._model;
    this._prefetches = orig._prefetches;
  },

  /**
   * Override of {@link BaseQuery#_spawn}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_spawn}
   */
  _spawn: function(type) {
    if (this._prefetches.length) {
      this._validateSpawn(type, 'with', [SelectQuery]);
    }
    return this._super.apply(this, arguments);
  },

  /**
   * Override of {@link BaseQuery#_execute}. Performs a pre-fetch after the
   * execution.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_execute}
   */
  _execute: function() {
    return this._super()
      .tap(this._prefetch.bind(this));
  },

  /**
   * Perform all necessary pre-fetches.
   *
   * @method
   * @private
   * @param {Array.<Model>} records The records for which to pre-fetch.
   * @return {Promise} A promise that will resolve when the pre-fetch has
   * completed.
   */
  _prefetch: function(records) {
    return BluebirdPromise.map(this._prefetches, function(relation) {
      return relation.prefetch(records);
    });
  },

  /**
   * Apply all transforms for fields within conditions.
   *
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransform: function(field) {
    field = this._fieldForDatabase(field);
    field = this._fieldFullyQualified(field);
    return field;
  },

  /**
   * Transform a field name to the relevant database column name.
   *
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldForDatabase: function(field) {
    var lookup = this._model.__class__.prototype[field + 'Attr'];
    if (lookup) {
      field = lookup;
    }
    return field;
  },

  /**
   * Transform a field name to a fully qualified name by prepending the table
   * name if the database field is not already qualified.
   *
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldFullyQualified: function(field) {
    if (field.indexOf('.') === -1) {
      field = this._model.tableName + '.' + field;
    }
    return field;
  },

  /**
   * Override of {@link BoundQuery#all}. Prepends the table name to each of the
   * fields in the query's condition.
   *
   * @method
   * @private
   * @see {@link BoundQuery#all}
   */
  all: function() {
    var query = this._super.apply(this, arguments);
    if (query._where) {
      query._where =
        query._where.transform(this._fieldTransform.bind(this));
    }
    return query;
  },

  /**
   * Pre-fetch related objects.
   *
   * @method
   * @public
   * @param {String} association The name of the relation to pre-fetch.
   * @return {ChainedQuery} The newly configured query.
   */
  with: function(association) {
    var dup = this._dup();
    var prototype = this._model.__class__.prototype;
    var relation = prototype[association + 'Relation'];
    dup._prefetches.push(relation);
    return dup;
  },

  /**
   * Convenience method for finding objects by primary key. Essentially, this
   * just does the following:
   *
   *     query.where({ pk: pk }).limit(1).fetchOne()
   *
   * @method
   * @public
   * @param {Integer|?} pk The primary key of the object to find.
   * @return {Promise} A promise resolves with the found object.
   */
  find: function(pk) {
    return this.where({ pk: pk }).limit(1).fetchOne();
  }

});

module.exports = ModelQuery.reopenClass({ __name__: 'ModelQuery' });
