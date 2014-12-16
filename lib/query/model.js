'use strict';

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
  }

});

module.exports = ModelQuery.reopenClass({ __name__: 'ModelQuery' });
