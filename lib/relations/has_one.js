'use strict';

var HasMany = require('./has_many');
var inflection = require('../util/inflection');

/**
 * The has many relation for models.
 *
 * For example:
 *
 *     var User = Model.extend({
 *       blog: hasOne()
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
 * @param {Boolean} [options.implicit] Whether this relation is being added
 * implicitly by the system.
 * @function Database#hasOne
 */

/**
 * The has many relation for models.
 *
 * @protected
 * @constructor HasOne
 * @extends HasMany
 * @see {@link Database#hasOne}
 */
var HasOne = HasMany.extend();

HasOne.reopen(/** @lends HasOne# */ {
  init: function() {
    this._super.apply(this, arguments);

    if (this._options.through) {
      this._options.through = inflection.singularize(this._options.through);
    }
  },

  /**
   * The item property for this relation.
   *
   * This property allows access to the cached object that has been fetched
   * for a specific model in a given relation. Before the cache has been
   * filled, accessing this property will throw an exception.
   *
   * It is accessible on an individual model via `<singular>` and via
   * `get<Singular>`. For instance, a user that has one blog would cause this
   * method to get triggered via `user.blog` or `user.getBlog`.
   *
   * The naming conventions are set forth in {@link HasOne#overrides}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  item: function(instance) {
    return this.collection(instance)[0];
  },

  /**
   * The item property setter for this relation.
   *
   * This property allows altering the associated object of a specific model in
   * a given relation.
   *
   * It is accessible on an individual model via assignment with `<singular>`
   * and via `set<Singular>`. For instance, a user that has one blog would
   * cause this method to get triggered via
   * `user.blog = '...'` or `user.setBlog`.
   *
   * The naming conventions are set forth in {@link HasOne#overrides}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  set: function(instance, value) {
    var collection = this._getCollectionCache(instance);
    var current = collection && collection[0];
    if (current) { this.removeObjects(instance, current); }
    if (value) { this.addObjects(instance, value); }
  },

  /**
   * Fetch the related object.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  fetch: function(instance) {
    return this.objectsQuery(instance).fetch().get('0');
  },

  /**
   * Override of {@link HasMany#scopeObjectQuery} that ensures that only one
   * object will be fetched.
   *
   * @method
   * @protected
   * @see {@link HasMany#scopeObjectQuery}
   */
  scopeObjectQuery: function(/*instance, query*/) {
    return this._super.apply(this, arguments).limit(1);
  },

  /**
   * Override of {@link HasMany#_prefetchQuery} that ensures that only the
   * necessary number of items are prefetched.
   *
   * @method
   * @protected
   * @see {@link HasMany#_prefetchQuery}
   */
  _prefetchQuery: function(instances) {
    return this._super.apply(this, arguments).limit(instances.length);
  },

  /**
   * Override of {@link HasMany#beforeAssociatingObjects} that ensures that the
   * collection cache always exists when associating objects (since with a
   * has-one it represents all possible objects in the relationship).
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeAssociatingObjects}
   */
  beforeAssociatingObjects: function(instance/*, ...*/) {
    this._setCollectionCache(instance, []);
    return this._super.apply(this, arguments);
  },

  /**
   * Override of {@link BaseRelation#overrides}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#overrides}
   */
  overrides: function() {
    this._super();

    if (!this._options.implicit) {
      this.removeOverride('<plural>');
      this.removeOverride('<singular>Objects');
      this.removeOverride('add<Singular>');
      this.removeOverride('add<Plural>');
      this.removeOverride('remove<Singular>');
      this.removeOverride('remove<Plural>');
      this.removeOverride('clear<Plural>');

      this.overrideProperty('<singular>', 'item', 'set');
      this.addHelper('get<Singular>', 'item');
      this.addHelper('set<Singular>', 'set');
      this.addHelper('fetch<Singular>', 'fetch');
    }
  },

});

module.exports = HasOne.reopenClass({ __name__: 'HasOne' });
