'use strict';

var Mixin = require('../util/mixin');

var hook = function() {
  // make sure that the mixin could be included in any order by having each one
  // of the hooks call super.
  return this._super.apply(this, arguments);
};

var overridable = function(name) {
  return function() {
    return this['_' + name].apply(this, arguments);
  };
};

/**
 * HasMany mixin for definition of hooks.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * This method is overridable my mixins. See the default implementation,
   * {@link HasMany#_scopeObjectQuery} for more details. Mixins should either
   * call super or fully handle scoping.
   *
   * @method
   * @protected
   * @see {@link HasMany#_scopeObjectQuery}
   */
  scopeObjectQuery: overridable('scopeObjectQuery'),

  /**
   * This method is overridable my mixins. See the default implementation,
   * {@link HasMany#_createObject} for more details. Mixins should either
   * call super or fully handle creating objects.
   *
   * @method
   * @protected
   * @see {@link HasMany#_createObject}
   */
  createObject: overridable('createObject'),

  /**
   * This method is overridable my mixins. See the default implementation,
   * {@link HasMany#_addObjects} for more details. Mixins should either
   * call super or fully handle adding objects.
   *
   * @method
   * @protected
   * @see {@link HasMany#_addObjects}
   */
  addObjects: overridable('addObjects'),

  /**
   * This method is overridable my mixins. See the default implementation,
   * {@link HasMany#_removeObjects} for more details. Mixins should either
   * call super or fully handle removing objects.
   *
   * @method
   * @protected
   * @see {@link HasMany#_removeObjects}
   */
  removeObjects: overridable('removeObjects'),

  /**
   * This method is overridable my mixins. See the default implementation,
   * {@link HasMany#_clearObjects} for more details. Mixins should either
   * call super or fully handle clearing objects.
   *
   * @method
   * @protected
   * @see {@link HasMany#_clearObjects}
   */
  clearObjects: overridable('clearObjects'),

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
