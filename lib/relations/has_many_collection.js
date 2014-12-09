'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

_.str = require('underscore.string');

/**
 * HasMany mixin for collection data cached on a model instance.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {
  init: function() {
    this._super.apply(this, arguments);
    this._collectionCacheKey = '_' + this._name;
  },

  /**
   * Get the {@link HasMany#collection} cache value.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @return {Array} value The value of the collection cache.
   */
  _getCollectionCache: function(instance) {
    return instance[this._collectionCacheKey];
  },

  /**
   * Update the {@link HasMany#collection} cache to contain a new value.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} value The new value for the collection cache.
   */
  _setCollectionCache: function(instance, value) {
    instance[this._collectionCacheKey] = value;
  },

  /**
   * Add to the {@link HasMany#collection} cache if it's been loaded.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} The objects to add.
   */
  _unionCollectionCache: function(instance, objects) {
    var value = instance[this._collectionCacheKey];
    if (value) {
      this._setCollectionCache(instance, _.union(value, objects));
    }
  },

  /**
   * Remove from the {@link HasMany#collection} cache if it's been loaded.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} The objects to remove.
   */
  _differenceCollectionCache: function(instance, objects) {
    var value = instance[this._collectionCacheKey];
    if (value) {
      this._setCollectionCache(instance, _.difference(value, objects));
    }
  },

  /**
   * Clear the {@link HasMany#collection} cache if it's been loaded.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   */
  _clearCollectionCache: function(instance) {
    var value = instance[this._collectionCacheKey];
    if (value) {
      this._setCollectionCache(instance, []);
    }
  },

  /**
   * Implementation of {@link HasMany#beforeClearingObjects} for updating
   * caches.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeClearingObjects}
   */
  beforeClearingObjects: function(instance) {
    this._clearCollectionCache(instance);
    this._super.apply(this, arguments);
  },

  /**
   * This simply creates an empty cache into which fetched associated objects
   * can be stored.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeAssociatingFetchedObjects}
   */
  beforeAssociatingFetchedObjects: function(instance/*, objects*/) {
    this._setCollectionCache(instance, []);
    this._super.apply(this, arguments);
  },

  /**
   * Adds to the collection cache when adding associated objects.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeAssociatingObjects}
   */
  beforeAssociatingObjects: function(instance, objects/*, options*/) {
    this._unionCollectionCache(instance, objects);
    this._super.apply(this, arguments);
  },

  /**
   * Removes from the collection cache when removing associated objects.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeDisassociatingObjects}
   */
  beforeDisassociatingObjects: function(instance, objects/*, options*/) {
    this._differenceCollectionCache(instance, objects);
    this._super.apply(this, arguments);
  },

  /**
   * Create a collection cache when new instances are created (those that are
   * not loaded).
   *
   * @method
   * @protected
   * @see {@link HasMany#afterInitializing}
   */
  afterInitializing: function(instance) {
    if (!instance.persisted) {
      this._setCollectionCache(instance, []);
    }
  }

});
