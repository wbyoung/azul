'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Promise = require('bluebird');

/**
 * BelongsTo mixin for model overrides.
 *
 * This mixin separates some of the logic of {@link BelongsTo} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends BelongsTo# */ {

  /**
   * Override of the the model's `_dependents` method.
   *
   * This allows the relation to save the related object in response to the
   * instance on which it is operating being saved.
   *
   * @return {Array.<Model>}
   * @see {@link RelationSave#_dependents}
   */
  dependents: function(relation) {
    return function() {
      var result = this._super().slice();
      var related = relation._related(this);
      if (related) {
        result.push(related);
      }
      return result;
    };
  },

  /**
   * Override of the the model's `_relaints` method.
   *
   * @public
   * @method
   * @return {Array.<Model>}
   * @see {@link RelationSave#_reliants}
   */
  reliants: function(/*relation*/) {
    return function() {
      return this._super();
    };
  },

  /**
   * Override of the the model's `_presave` method.
   *
   * After the of saving the related object (which presumably occurred), this
   * checks to see if it has a different primary key (for instance, it was a
   * newly inserted object) & will update the foreign key (via the foreign
   * key property).
   *
   * It is worth noting here that {@link RelationModelSave} will try to save
   * all values provided in `_dependents` including the related instance we
   * provide in {@link BelongsTo#dependents}, but there can be no guarantee
   * since it's possible to have relationships that each require the save of
   * the other. {@link BelongsTo#postsave} handles this scenario.
   *
   * It is accessible on an individual model via `_presave`, and as such is an
   * override of the model's `_presave` method.
   *
   * As with all other relation methods, the naming conventions are set forth
   * in {@link BelongsTo.methods}.
   *
   * @method
   * @protected
   * @param {Relation} relation
   * @return {Function}
   * @see {@link BaseRelation#methods}
   * @see {@link RelationSave#_presave}
   */
  presave: function(relation) {
    return Promise.method(function(/*options*/) {
      relation._updateForeignKey(this);
      return this._super.apply(this, arguments);
    });
  },

  /**
   * Override of the the model's `_postsave` method.
   *
   * Handle relationships that create a circular dependency. In these
   * relationships, you can't insert one model with the proper foreign key
   * until the other has been saved.
   *
   * So after the saves have occurred, we re-check if the foreign key needs to
   * be updated & update & clean that attribute that explicitly.
   *
   * @method
   * @protected
   * @param {Relation} relation
   * @return {Function}
   * @see {@link BaseRelation#methods}
   * @see {@link RelationSave#_postsave}
   */
  postsave: function(relation) {
    return Promise.method(function(options) {
      if (options.partial) { return this._super(options); }

      var promise = Promise.resolve();
      var changed = relation._updateForeignKey(this);
      if (changed && !options.partial) {
        var foreignKey = relation.foreignKey;
        var updates = _.object([[foreignKey, this[foreignKey]]]);
        var conditions = { pk: this.pk };
        var query = relation._relatedModel.objects
          .where(conditions)
          .update(updates);
        promise = promise
          .then(query.execute.bind(query))
          .then(this.cleanAttribute.bind(this, relation.foreignKeyAttr));
      }
      return promise.then(this._super.bind(this, options));
    });
  },

  /**
   * Updates the foreign key, but only does so if it's changed.
   *
   * @method
   * @private
   * @param {Model} instance The model instance on which to operate.
   * @return {Boolean} Whether a change was made.
   */
  _updateForeignKey: function(instance) {
    var foreignKeyAttr = this.foreignKeyAttr;
    var primaryKey = this.primaryKey;
    var related = this._related(instance);

    var current = instance.getAttribute(foreignKeyAttr);
    var updated = _.get(related, primaryKey);
    var changed = current !== updated;
    if (changed) {
      instance.setAttribute(foreignKeyAttr, updated);
    }
    return changed;
  },

});
