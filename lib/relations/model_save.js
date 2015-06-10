'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Promise = require('bluebird');

/**
 * Functionality for supporting bulk saving of a relationship object graph.
 *
 * This mixin separates some of the logic of {@link Model} that is specific to
 * relationships, and it is only intended to be mixed into only that one class.
 *
 * It must be mixed in after {@link Model#save} is defined.
 *
 * @mixin RelationModelSave
 */
module.exports = Mixin.create(/** @lends RelationModelSave */ {

  /**
   * Models on which this object depends that should be saved before the
   * current model instance.
   *
   * There is no guarantee that the dependent models will in fact be saved
   * since certain circular relationship will make this impossible.
   *
   * This is used by models defining {@link BelongsTo} relationships to ensure
   * the related objects are saved prior to the defining model.
   *
   * @method
   * @protected
   * @scope internal
   * @return {Array.<Model>}
   */
  _dependents: function() { return []; },

  /**
   * Models which are reliant this object that should be saved after the
   * current model instance.
   *
   * This is used by models defining {@link HasMany} relationships to ensure
   * the related objects are saved after to the defining model.
   *
   * @method
   * @protected
   * @scope internal
   * @return {Array.<Model>}
   */
  _reliants: function() { return []; },

  /**
   * Actions to take prior to saving a model. These actions will be performed
   * both when a bulk save of many related instances occurs and when a single
   * instance is saved. The difference is that the pre-save will be processed
   * on the entire group before each item in the group is saved.
   *
   * Relations should override this method.
   *
   * @method
   * @protected
   * @scope internal
   * @param {Object} options From {@link Model#save}
   * @param {Boolean} options.partial This will be true when the object being
   * saved is part of a larger saving operation & only needs to be partially
   * saved at this point.
   * @return {Promise}
   * @see {RelationModelSave#save}
   */
  _presave: Promise.method(function(/*options*/) {}),

  /**
   * Actions to take after saving a model. This follows the same logic as
   * {@link RelationModelSave#_presave}.
   *
   * Relations should override this method.
   *
   * @method
   * @protected
   * @scope internal
   * @param {Object} options From {@link Model#save}
   * @param {Boolean} options.partial This will be true when the object being
   * saved is part of a larger saving operation & only needs to be partially
   * saved at this point.
   * @return {Promise}
   * @see {RelationModelSave#save}
   */
  _postsave: Promise.method(function(/*options*/) {}),

  /**
   * Searches through the graph of relations and orders the relations so that
   * when saved in order, most dependent relations will get saved first.
   *
   * @method
   * @private
   * @return {Array.<Model>}
   */
  _orderRelationsForBulkSave: function() {
    var immediate = [];
    var deferred = [this];
    var remaining = [this];
    var traversed = [];

    while (remaining.length) {
      var current = remaining.shift();
      var dependents = current._dependents();
      var reliants = current._reliants();
      immediate = _(immediate)
        .concat(_.difference(dependents, traversed)).uniq().value();
      deferred = _(deferred)
        .concat(_.difference(reliants, traversed)).uniq().value();
      remaining = _(remaining)
        .concat(dependents, reliants).difference(traversed).uniq().value();
      traversed.push(current);
    }

    return _.uniq(immediate.concat(deferred));
  },

  /**
   * Override of {@link Model#save} to support bulk saving of related objects.
   *
   * When `bulk` is true, the default, related objects will be found. If the
   * there are related objects, they will be processed like so:
   *
   *   - `_presave` all related models
   *   - `save` all related models w/ `partial: true`
   *   - `_postsave` all related models
   *
   * The `partial` flag makes its way into the `_presave` and `_postsave`
   * operations when the method recurses. The following example stack shows how
   * this works:
   *
   *  Article({ id: 1 }).save()
   *
   *    _.noop // `presave` skipped
   *
   *    Article({ id: 1 })._presave({}) // each `_presave`
   *    Comment({ id: 1 })._presave({})
   *    Comment({ id: 2 })._presave({})
   *
   *    Article({ id: 1 }).save({ partial: true }) // each `save`
   *      Article({ id: 1 })._presave({ partial: true })
   *      Article({ id: 1 })._super.save({})
   *      Article({ id: 1 })._presave({ partial: true })
   *
   *    Comment({ id: 1 }).save({ partial: true })
   *      Comment({ id: 1 })._presave({ partial: true })
   *      Comment({ id: 1 })._super.save({})
   *      Comment({ id: 1 })._presave({ partial: true })
   *
   *    Comment({ id: 2 }).save({ partial: true })
   *      Comment({ id: 2 })._presave({ partial: true })
   *      Comment({ id: 2 })._super.save({})
   *      Comment({ id: 2 })._presave({ partial: true })
   *
   *    Article({ id: 1 })._postsave({}) // each `_postsave`
   *    Comment({ id: 1 })._postsave({})
   *    Comment({ id: 2 })._postsave({})
   *
   *    _.noop // `postsave` skipped
   *
   *    _.identity(Article({ id: 1 })) // `save` skipped
   *
   * When there are no related objects (or a partial save is occurring), a
   * simple `_presave`/`save`/`_postsave` will occur on the model.
   *
   * @method
   * @public
   * @see {@link Model#save}
   */
  save: Promise.method(function(options) {

    var opts = options || {};
    var promise = Promise.resolve();
    var related = opts.partial ? [] : this._orderRelationsForBulkSave();
    var deepSavingOpts = _.extend({}, opts, { partial: true });

    var presave = this._presave.bind(this, opts);
    var save = this._super.bind(this, _.omit(opts, 'partial'));
    var postsave = this._postsave.bind(this, opts);

    // no need to save related if it's just this & nothing else
    if (_.eq(related, [this])) { related = []; }

    // do not double-save
    if (_.contains(related, this)) {
      presave = _.noop;
      postsave = _.noop;
      save = _.constant(this);
    }

    return promise.return(related)
    .each(_.method('_presave', opts))
    .each(_.method('save', deepSavingOpts))
    .each(_.method('_postsave', opts))
    .tap(presave)
    .then(save)
    .tap(postsave);
  }),

});
