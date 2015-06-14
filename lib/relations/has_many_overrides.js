'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Promise = require('bluebird');

/**
 * HasMany mixin for model overrides.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Override of the model's init method.
   *
   * This allows the relation to create a collection cache when new instances
   * are created (those that are not loaded).
   *
   * During the process of creating the model, it checks to see if it was
   * loaded from the database & if it was not, it is assumed to be a brand new
   * object that could not have any associations. It therefore fills the
   * collection cache with an empty array.
   *
   * Its inclusion also ensures that the relation will be configured during the
   * initialization of any object.
   *
   * It is accessible on an individual model via `init`, and as such is an
   * override of the builtin init method.
   *
   * As with all other relation methods, the naming conventions are set forth
   * in {@link BelongsTo.methods}.
   *
   * @method
   * @protected
   * @param {Relation} relation
   * @return {Function}
   * @see {@link BaseRelation#methods}
   */
  initialize: function(relation) {
    return function() {
      this._super.apply(this, arguments);
      relation.afterInitializing(this);
    };
  },

  /**
   * Override of the the model's `_dependents` method.
   *
   * @return {function():Array.<Model>}
   * @see {@link RelationSave#_dependents}
   */
  dependents: function(/*relation*/) {
    return function() {
      return this._super();
    };
  },

  /**
   * Override of the the model's `_relaints` that adds any related objects that
   * require updating.
   *
   * The models only need to be saved if they will not be processable by
   * {@link HasMany#postsave}. The `postsave` handles foreign key updates,
   * so reliant models are:
   *
   *   - Newly created objects
   *   - Dirty objects, unless only the foreign key is dirty
   *
   * Searches the collection cache and in-flight objects.
   *
   * The resulting objects will be saved before the `postsave`, potentially
   * requiring `postsave` to do less work.
   *
   * @return {function():Array.<Model>}
   * @see {@link RelationSave#_reliants}
   */
  reliants: function(relation) {
    return function() {
      var result = this._super().slice();
      var foreignKeyAttr = relation.foreignKeyAttr;
      var data = relation._getInFlightData(this);
      var objects = [];

      // TODO: it may not make sense to be reliant on the objects from the
      // collection cache. that would effectively mean that we're trying to
      // traverse the whole model object graph. that's not really the goal. the
      // goal is to save the updated relations. we should really just be
      // concerned with the foreign keys and getting those updated.

      // for instance, if an article fetched 10 comments, they would now be in
      // the collection cache. if each was updated, should saving the article
      // also save them? possibly, but probably not. the article did not
      // change. if the article added a new comment, it has now changed. the
      // change to the article, one could argue, is that it now has a new
      // comment. saving it should only save the new comment (if dirty). the
      // saving of the other updated comments should be the responsibility of
      // the user.

      objects = objects.concat(relation._getCollectionCache(this) || []);
      objects = objects.concat(data.add);
      objects = objects.concat(_.filter(data.remove, 'persisted'));
      _.forEach(objects, function(related) {
        var dirty = _.without(related.dirtyAttributes, foreignKeyAttr);
        var save = dirty.length || related.newRecord;
        if (save) {
          result.push(related);
        }
      });
      return result;
    };
  },

  /**
   * Override of the the model's `_postsave` method.
   *
   * This allows the relation to save related objects & update the database to
   * reflect the associations in response to the instance on which it is
   * operating being saved.
   *
   * It uses the combined results from calls to {@link HasMany#addObjects},
   * {@link HasMany#removeObjects}, and {@link HasMany#clearObjects} to
   * determine what actions need to be taken, then perform updates accordingly.
   * The actions, {@link HasMany#executeAdd}, {@link HasMany#executeRemove},
   * and {@link HasMany#executeClear} will be invoked if necessary.
   *
   * It understands that some related objects have already been saved (if they
   * were included in {@link HasMany#reliants}).
   *
   * It is accessible on an individual model via `_postsave`, and as such is an
   * override of the model's `_postsave` method.
   *
   * As with all other relation methods, the naming conventions are set forth
   * in {@link HasMany.methods}.
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

      var promise = this._super(options);
      var data = relation._getInFlightData(this);
      var self = this;

      if (data.clear) {
        promise = promise.then(function() {
          return relation.executeClear(self);
        });
      }

      if (data.add.length || data.remove.length) {
        promise = promise.then(function() {
          return [
            relation.executeAdd(self, data.add),
            relation.executeRemove(self, data.remove),
          ];
        })
        .all();
      }

      return promise;
    });
  },

});
