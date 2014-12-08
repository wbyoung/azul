'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

_.str = require('underscore.string');

/**
 * HasMany mixin for data cached on a model instance.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {
  init: function() {
    this._super.apply(this, arguments);
    this._collectionCacheKey = '_' + this._name;
    this._inFlightDataKey =
      '_' + _.str.camelize(this._name + '_objectsInFlight');
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
   * @typedef {Object} HasMany~InFlightData
   * @property {Array.<Model>} add An array of objects to add to the
   * relationship.
   * @property {Array.<Model>} remove An array of objects to remove from the
   * relationship.
   * @property {Boolean} clear Whether or not the related objects should be
   * cleared entirely.
   */

  /**
   * Get in flight data, the information pertinent to this relation that has
   * not yet been saved.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @return {HasMany~InFlightData} In flight data.
   */
  _getInFlightData: function(instance) {
    return _.defaults({}, instance[this._inFlightDataKey], {
      clear: false,
      add: [],
      remove: []
    });
  },

  /**
   * Set the in flight.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {HasMany~InFlightData} data In flight data.
   */
  _setInFlightData: function(instance, data) {
    instance[this._inFlightDataKey] = data;
  },

  /**
   * Implementation of {@link HasMany#beforeAddingObjects} for updating caches.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeAddingObjects}
   */
  beforeAddingObjects: function(instance, objects) {
    var data = this._getInFlightData(instance);
    var noLongerRemoved = _.intersection(objects, data.remove);
    var stillNeedAdding = _.difference(objects, noLongerRemoved);
    data.remove = _.difference(data.remove, noLongerRemoved);
    data.add = _.union(data.add, stillNeedAdding);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
  },

  /**
   * Implementation of {@link HasMany#afterAddingObjects} for updating caches.
   *
   * @method
   * @protected
   * @see {@link HasMany#afterAddingObjects}
   */
  afterAddingObjects: function(instance, objects) {
    var data = this._getInFlightData(instance);
    data.add = _.difference(data.add, objects);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
  },

  /**
   * Implementation of {@link HasMany#beforeRemovingObjects} for updating
   * caches.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeRemovingObjects}
   */
  beforeRemovingObjects: function(instance, objects) {
    var data = this._getInFlightData(instance);
    var noLongerAdded = _.intersection(objects, data.add);
    var stillNeedRemoving = _.difference(objects, noLongerAdded);
    data.add = _.difference(data.add, noLongerAdded);
    data.remove = _.union(data.remove, stillNeedRemoving);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
  },

  /**
   * Implementation of {@link HasMany#afterRemovingObjects} for updating
   * caches.
   *
   * @method
   * @protected
   * @see {@link HasMany#afterRemovingObjects}
   */
  afterRemovingObjects: function(instance, objects) {
    var data = this._getInFlightData(instance);
    data.remove = _.difference(data.remove, objects);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
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
    this._setInFlightData(instance, { clear: true, add: [], remove: [] });
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
