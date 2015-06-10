'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var BaseRelation = require('./base');
var Actionable = require('maguey').Actionable;
var Hooks = require('./has_many_hooks');
var Config = require('./has_many_config');
var Query = require('./has_many_query');
var Associations = require('./has_many_associations');
var Overrides = require('./has_many_overrides');
var Through = require('./has_many_through');
var Prefetch = require('./has_many_prefetch');
var Collection = require('./has_many_collection');
var InFlight = require('./has_many_in_flight');

/**
 * The has many relation for models.
 *
 * For example:
 *
 *     var User = Model.extend({
 *       articles: hasMany('articles')
 *     });
 *
 * @public
 * @param {Class|String} [relatedModel] The model to which this relates.
 * @param {Object} [options]
 * @param {String} [options.inverse] The name of the inverse relationship.
 * @param {String} [options.primaryKey] The name of the primary key in the
 * relationship.
 * @param {String} [options.foreignKey] The name of the foreign key in the
 * relationship.
 * @param {String} [options.through] Specify the name of a relationship through
 * which this collection is accessed.
 * @param {String} [options.source] When using `through` this is the name of
 * the relationship on the destination model. The default value is the name of
 * the attribute for the relationship.
 * @function Database#hasMany
 */

/**
 * The has many relation for models.
 *
 * @protected
 * @constructor HasMany
 * @extends BaseRelation
 * @see {@link Database#hasMany}
 */
var HasMany = BaseRelation.extend();

HasMany.reopen(Hooks); // must be first, contains overridable methods
HasMany.reopen(Config);
HasMany.reopen(Query);
HasMany.reopen(Associations);
HasMany.reopen(Overrides);
HasMany.reopen(Through);
HasMany.reopen(Prefetch);
HasMany.reopen(Collection);
HasMany.reopen(InFlight);

HasMany.reopenClass({
  joinKey: 'primaryKey',
  inverseKey: 'foreignKey',
});

/**
 * Notify of changes around a call to super.
 *
 * @function HasMany~notify
 * @private
 * @param {String} name The suffix of the before/after methods to call.
 * @return {Function} A method that will call before & after methods.
 */
var notify = function(name) {
  var before = 'before' + _.capitalize(name);
  var after = 'after' + _.capitalize(name);
  return function() {
    this[before].apply(this, arguments);
    this._super.apply(this, arguments);
    this[after].apply(this, arguments);
  };
};

HasMany.reopen(/** @lends HasMany# */ {

  /**
   * Determine if this relation is a many-to-many relationship, that is if the
   * inverse relationship is a many relationship as well. Has many
   * relationships are not many-to-many by default.
   *
   * Mixins can override {@link HasMany#inverseIsMany} when they work in such a
   * way to allow many-to-many relationships. This is the default
   * implementation.
   *
   * @return {Boolean} True if the relationship is many-to-many.
   */
  _inverseIsMany: function() {
    return false;
  },

  /**
   * The create object method for this relation.
   *
   * This simply creates a new object that has the appropriate relation data
   * already set.
   *
   * This method invalidates the {@link HasMany#objectsQuery} cache and adds
   * the created object to the {@link HasMany#collection} (if loaded).
   *
   * It is accessible on an individual model via `create<Singular>`. For
   * instance, a user that has many articles would cause this method to get
   * triggered via `user.createArticle`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * Mixins can override {@link HasMany#createObject} to change the way related
   * objects are created. This is the default implementation.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  _createObject: function(instance) {
    var args = _.rest(arguments);
    var relatedModel = this._relatedModel;
    var result = relatedModel.create.apply(relatedModel, args);

    this.beforeCreatingObject(instance, result); // note: no after hook
    this.associate(instance, result);

    return result;
  },

  /**
   * The add objects method for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery} cache and adds
   * the related objects to the {@link HasMany#collection} (if loaded).
   *
   * It is accessible on an individual model via `add<Singular>` and
   * `add<Plural>`. For instance a user that has many articles would cause this
   * method to get triggered via `user.addArticle` or `user.addArticles`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * Mixins can override {@link HasMany#addObjects} to change the way related
   * objects are added. This is the default implementation.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  _addObjects: function(instance) {
    var args = _.rest(arguments);
    var objects = _.flatten(args);
    this.beforeAddingObjects(instance, objects);
    this.associateObjects(instance, objects);
    return Actionable.create(instance.save.bind(instance));
  },

  /**
   * Perform the necessary updates to add objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * Mixins can override {@link HasMany#executeAdd} to change the way updates
   * are performed when related objects are added. This is the default
   * implementation.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} objects The objects to add to the relationship.
   */
  _executeAdd: function(instance, objects) {
    var self = this;
    var after = this.afterAddingObjects.bind(this, instance, objects);
    return self._updateForeignKeys(instance, objects, instance.id).tap(after);
  },

  /**
   * The remove objects method for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery} cache and removes
   * the related objects from the {@link HasMany#collection} (if loaded).
   *
   * It is accessible on an individual model via `remove<Singular>` and
   * `remove<Plural>`. For instance a user that has many articles would cause
   * this method to get triggered via `user.removeArticle` or
   * `user.removeArticles`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * Mixins can override {@link HasMany#removeObjects} to change the way
   * related objects are removed. This is the default implementation.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  _removeObjects: function(instance) {
    var args = _.rest(arguments);
    var objects = _.flatten(args);
    this.beforeRemovingObjects(instance, objects);
    this.disassociateObjects(instance, objects);
    return Actionable.create(instance.save.bind(instance));
  },

  /**
   * Perform the necessary updates to remove objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * Mixins can override {@link HasMany#executeRemove} to change the way
   * updates are performed when related objects are removed. This is the
   * default implementation.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} objects The objects to remove from the relationship.
   */
  _executeRemove: function(instance, objects) {
    var self = this;
    var after = this.afterRemovingObjects.bind(this, instance, objects);
    var removable = _.filter(objects, 'persisted');
    return self._updateForeignKeys(instance, removable, undefined).tap(after);
  },

  /**
   * The clear objects method for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery} cache and removes
   * all objects from the {@link HasMany#collection} (if loaded).
   *
   * It is accessible on an individual model via `clear<Plural>`. For
   * instance, a user that has many articles would cause this method to get
   * triggered via `user.clearArticles`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * Mixins can override {@link HasMany#clearObjects} to change the way related
   * objects are cleared. This is the default implementation.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  _clearObjects: function(instance) {
    this.beforeClearingObjects(instance);
    return Actionable.create(instance.save.bind(instance));
  },

  /**
   * Perform the necessary updates to clear objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * Mixins can override {@link HasMany#executeClear} to change the way clears
   * are performed when related objects are cleared. This is the default
   * implementation.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   */
  _executeClear: function(instance) {
    var updates = _.object([[this.foreignKey, undefined]]);
    var query = this.objectsQuery(instance).update(updates);
    var after = this.afterClearingObjects.bind(this, instance);
    return query.execute().tap(after);
  },

  /**
   * Update foreign keys for a set of related objects.
   *
   * This will update the foreign keys of several objects in a single query.
   * This allows much faster creation of associations at the database level.
   *
   * After a successful update, it will clean the foreign key attribute of
   * each updated object, likely leaving the object completely clean.
   *
   * @method
   * @private
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} relatedObjects The related models on which to
   * update keys.
   * @param {?} id The id to use as the value of the foreign key.
   * @return {Promise} A promise that resolves when the update has finished.
   */
  _updateForeignKeys: Promise.method(function(instance, relatedObjects, id) {
    if (!_.any(relatedObjects, 'dirty')) { return; }

    var foreignKey = this.foreignKey;
    var foreignKeyAttr = this.foreignKeyAttr;
    var relatedPks = _.map(relatedObjects, 'pk');

    var updates = _.object([[foreignKey, id]]);
    var conditions = {};
    if (relatedPks.length === 1) { conditions.pk = relatedPks[0]; }
    else { conditions.pk$in = relatedPks; }

    var query = this._relatedModel.objects;
    return query.where(conditions).update(updates).execute().then(function() {
      relatedObjects.forEach(function(obj) {
        obj.cleanAttribute(foreignKeyAttr);
      });
    });
  }),

  /**
   * Override of {@link HasMany#associateFetchedObjects} to call before & after
   * hooks so that mixins can get involved in the association process.
   *
   * @method
   * @protected
   * @see {@link HasMany#associateFetchedObjects}
   */
  associateFetchedObjects: notify('associatingFetchedObjects'),

  /**
   * Override of {@link HasMany#associateObjects} to call before & after hooks
   * so that mixins can get involved in the association process.
   *
   * @method
   * @protected
   * @see {@link HasMany#associateObjects}
   */
  associateObjects: notify('associatingObjects'),

  /**
   * Override of {@link HasMany#disassociateObjects} to call before & after
   * hooks so that mixins can get involved in the disassociation process.
   *
   * @method
   * @protected
   * @see {@link HasMany#disassociateObjects}
   */
  disassociateObjects: notify('disassociatingObjects'),

});

HasMany.reopenClass(/** @lends HasMany */ {

  /**
   * Naming conventions for `HasMany` relations.
   *
   * @private
   * @type {Object}
   * @see {@link BaseRelation#methods}
   */
  methods: {
    '<plural>': BaseRelation.property('collection'),
    '<singular>Objects': BaseRelation.property('objectsQuery'),
    'create<Singular>': BaseRelation.helper('createObject'),
    'add<Singular>': BaseRelation.helper('addObjects'),
    'add<Plural>': BaseRelation.helper('addObjects'),
    'remove<Singular>': BaseRelation.helper('removeObjects'),
    'remove<Plural>': BaseRelation.helper('removeObjects'),
    'clear<Plural>': BaseRelation.helper('clearObjects'),
    init: BaseRelation.method('initialize'),
    _dependents: BaseRelation.method('dependents'),
    _reliants: BaseRelation.method('reliants'),
    _postsave: BaseRelation.method('postsave'),
  },

});

module.exports = HasMany.reopenClass({ __name__: 'HasMany' });
