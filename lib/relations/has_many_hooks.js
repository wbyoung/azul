'use strict';

var Mixin = require('../util/mixin');

var hook = function() {
  // make sure that the mixin could be included in any order by having each one
  // of the hooks call super.
  return this._super.apply(this, arguments);
};

/**
 * HasMany mixin for definition of hooks.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Actions to take before associating fetched objects. Mixins can define this
   * method take action before the addition of objects to the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being added.
   */
  beforeAssociatingFetchedObjects: hook,

  /**
   * Actions to take after associating fetched objects. Mixins can define this
   * method take action after the addition of objects to the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being added.
   */
  afterAssociatingFetchedObjects: hook,

  /**
   * Actions to take before associating objects. Mixins can define this method
   * take action before the addition of objects to the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being added.
   */
  beforeAssociatingObjects: hook,

  /**
   * Actions to take after associating objects. Mixins can define this method
   * take action after the addition of objects to the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being added.
   */
  afterAssociatingObjects: hook,

  /**
   * Actions to take before disassociating objects. Mixins can define this
   * method take action before the removal of objects from the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being removed.
   */
  beforeDisassociatingObjects: hook,

  /**
   * Actions to take after disassociating objects. Mixins can define this
   * method take action after the removal of objects from the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being removed.
   */
  afterDisassociatingObjects: hook,

  /**
   * Actions to take before adding objects to the relation when specifically
   * requested via {@link HasMany#addObjects}. Mixins can define this method as
   * well to take action before the addition of objects to the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being added.
   */
  beforeAddingObjects: hook,

  /**
   * Actions to take after adding objects to the relation when specifically
   * requested via {@link HasMany#addObjects}. Mixins can define this method as
   * well to take action after the addition of objects to the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being added.
   */
  afterAddingObjects: hook,

  /**
   * Actions to take before removing objects from the relation when
   * specifically requested via {@link HasMany#removeObjects}. Mixins can
   * define this method as well to take action before the removal of objects
   * from the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being removed.
   */
  beforeRemovingObjects: hook,

  /**
   * Actions to take after removing objects from the relation when
   * specifically requested via {@link HasMany#removeObjects}. Mixins can
   * define this method as well to take action after the removal of objects
   * from the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects being removed.
   */
  afterRemovingObjects: hook,

  /**
   * Actions to take before clearing objects in the relation when
   * specifically requested via {@link HasMany#clearObjects}. Mixins can
   * define this method as well to take action before the clearing of objects
   * in the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   */
  beforeClearingObjects: hook,

  /**
   * Actions to take after clearing objects in the relation when
   * specifically requested via {@link HasMany#clearObjects}. Mixins can
   * define this method as well to take action after the clearing of objects
   * in the relationship.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   */
  afterClearingObjects: hook,

  /**
   * Actions to take after creating an new object of the model class.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   */
  afterInitializing: hook

});
