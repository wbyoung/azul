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
    this._objectsQueryCacheKey =
      '_' + _.str.camelize(this._name + '_objectsQueryCache');
  },

  /**
   * Update the {@link HasMany#objectsQuery} cache to contain a new value.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Object} value The new value.
   */
  _cacheObjectsQuery: function(instance, value) {
    instance[this._objectsQueryCacheKey] = value;
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
  }

});
