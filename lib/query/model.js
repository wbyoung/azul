'use strict';

var _ = require('lodash');
var BoundQuery = require('./bound');

var With = require('./model_with');
var Join = require('./model_join');
var Helpers = require('./model_helpers');
var FieldTransform = require('./model_field_transform');
var AutoJoin = require('./model_auto_join');

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
var ModelQuery = BoundQuery.extend();

ModelQuery.reopen(With);
ModelQuery.reopen(Join);
ModelQuery.reopen(Helpers);
ModelQuery.reopen(FieldTransform);
ModelQuery.reopen(AutoJoin); // must come after field transform

ModelQuery.reopen(/** @lends ModelQuery# */ {
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
  },

  /**
   * Convenience method for finding an object & creating it if it doesn't
   * exist. Essentially, this just does the following:
   *
   *     Model.where(attributes).limit(1).fetchOne()
   *     .catch(function(e) {
   *       if (e.code !== 'NO_RESULTS_FOUND') { throw e; }
   *       return Model.create(attributes).save();
   *     });
   *
   * @param {Object} attributes The attributes of the object to find or create.
   * @param {Object} defaults Additional attributes to set if the object needs
   * to be created.
   * @return {Promise} A promise resolves with the found or created object.
   */
  findOrCreate: function(attributes, defaults) {
    return this.where(attributes).limit(1).fetchOne()
    .catch(function(e) {
      if (e.code !== 'NO_RESULTS_FOUND') { throw e; }
      return this._model.create(_.extend({}, attributes, defaults)).save();
    }.bind(this));
  },

  /**
   * Return unique models by grouping by primary key.
   *
   * @return {ChainedQuery} The newly configured query.
   */
  unique: function() {
    return this.groupBy(this._model.__class__.prototype.pkAttr);
  },

});

module.exports = ModelQuery.reopenClass({ __name__: 'ModelQuery' });
