'use strict';

var _ = require('lodash');
var BoundQuery = require('./bound');
var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var UpdateQuery = require('./update');
var DeleteQuery = require('./delete');

var Core = require('./mixins/model_core');
var With = require('./mixins/model_with');
var Join = require('./mixins/model_join');
var Helpers = require('./mixins/model_helpers');
var FieldTransform = require('./mixins/model_field_transform');
var AutoJoin = require('./mixins/model_auto_join');


/**
 * A query bound to a specific model class.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#bind}.
 *
 * @protected
 * @constructor ModelQuery
 * @extends BoundQuery
 */
var ModelQuery = BoundQuery.extend();

ModelQuery.reopen(Core);
ModelQuery.reopen(Helpers);
ModelQuery.reopen(With);
ModelQuery.reopen(Join);
ModelQuery.reopen(AutoJoin);
ModelQuery.reopen(FieldTransform);

SelectQuery.reopen(Core);
SelectQuery.reopen(Helpers);
SelectQuery.reopen(With);
SelectQuery.reopen(Join);
SelectQuery.reopen(AutoJoin);
SelectQuery.reopen(FieldTransform);

InsertQuery.reopen(Core);
InsertQuery.reopen(Helpers);
InsertQuery.reopen(FieldTransform);

UpdateQuery.reopen(Core);
UpdateQuery.reopen(Helpers);
UpdateQuery.reopen(FieldTransform);

DeleteQuery.reopen(Core);
DeleteQuery.reopen(Helpers);
DeleteQuery.reopen(FieldTransform);


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

  /**
   * The same as {@link EntryQuery#select}, but you should omit the table name
   * argument as it will have already been bound. Also, unlike
   * {@link BoundQuery#select}, this will only allow selecting all columns.
   *
   * @method
   * @public
   * @return {SelectQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  all: function() {
    return this._spawnBound(SelectQuery, []);
  },

  /**
   * If executed directly, this works as an all query.
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return this.all().statement;
  },

});


/**
 * Simple shared method to call super & then add a {@link ModelCore#noload}
 * call after.
 *
 * @method ModelQuery~noload
 * @private
 * @return {ModelQuery} The resulting query.
 */
var noload = function() {
  return this._super.apply(this, arguments).noload();
};

ModelQuery.reopen(/** @lends ModelQuery# */ {

  /**
   * Override of {@link ModelQuery#select}.
   *
   * @method
   * @protected
   * @see {@link ModelQuery#select}
   */
  select: noload,

  /**
   * Override of {@link ModelQuery#delete}.
   *
   * @method
   * @protected
   * @see {@link ModelQuery#delete}
   */
  delete: noload,

  /**
   * Override of {@link ModelQuery#update}.
   *
   * @method
   * @protected
   * @see {@link ModelQuery#update}
   */
  update: noload,

  /**
   * Override of {@link ModelQuery#insert}.
   *
   * @method
   * @protected
   * @see {@link ModelQuery#insert}
   */
  insert: noload,

});

module.exports = ModelQuery.reopenClass({ __name__: 'ModelQuery' });
