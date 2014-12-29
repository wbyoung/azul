'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var BluebirdPromise = require('bluebird');

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
   * It is accessible on an individual model via `init`, and as such is an
   * override of the builtin init method.
   *
   * As with all other relation methods, the naming conventions are set forth
   * in {@link BelongsTo.methods}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  initialize: function(instance) {
    var args = _.rest(arguments);
    instance._super.apply(instance, args);
    this.afterInitializing(instance);
  },

  /**
   * Override of the model's save method.
   *
   * This allows the relation to save related objects & update the database to
   * reflect the associations in response to the instance on which it is
   * operating being saved.
   *
   * During the process of saving the related object, it uses the combined
   * results from calls to {@link HasMany#addObjects},
   * {@link HasMany#removeObjects}, and {@link HasMany#clearObjects} to
   * determine what actions need to be taken, then perform updates accordingly.
   *
   * It is accessible on an individual model via `save`, and as such is an
   * override of the builtin save method.
   *
   * As with all other relation methods, the naming conventions are set forth
   * in {@link HasMany.methods}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  save: function(instance) {
    var _super = instance._super;
    var args = _.rest(arguments);
    var self = this;
    var promise = BluebirdPromise.bind();
    var data = this._getInFlightData(instance);

    if (data.clear) {
      promise = promise.then(function() {
        return self.performClear(instance);
      });
    }

    if (data.add.length || data.remove.length) {
      promise = promise.then(function() {
        return [
          self.performAdd(instance, data.add),
          self.performRemove(instance, data.remove)
        ];
      })
      .all();
    }

    return promise.then(function() {
      return _super.apply(instance, args);
    });
  }

});
