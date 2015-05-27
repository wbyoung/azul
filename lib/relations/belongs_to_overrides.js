'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var BluebirdPromise = require('bluebird');

/**
 * BelongsTo mixin for model overrides.
 *
 * This mixin separates some of the logic of {@link BelongsTo} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends BelongsTo# */ {

  /**
   * Override of the model's save method.
   *
   * This allows the relation to save the related object in response to the
   * instance on which it is operating being saved.
   *
   * During the process of saving the related object, it checks to see if it
   * was a newly inserted object & will re-assign the foreign key (via the
   * foreign key property) once that object has been saved & assigned an id.
   *
   * It is accessible on an individual model via `save`, and as such is an
   * override of the builtin save method.
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
  save: function(instance) {
    var args = _.rest(arguments);
    var _super = instance._super;
    var foreignKeyAttr = this.foreignKeyAttr;
    var primaryKey = this.primaryKey;
    var related = this._related(instance);

    return BluebirdPromise.bind().then(function() {
      return related && related.save();
    })
    .then(function() {
      instance.setAttribute(foreignKeyAttr, _.get(related, primaryKey));
    })
    .then(function() {
      return _super.apply(instance, args);
    });
  }

});
