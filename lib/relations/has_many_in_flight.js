'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');

/**
 * HasMany mixin for in flight data cached on a model instance.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Mixin initialization.
   */
  init: function() {
    this._super.apply(this, arguments);
    this._inFlightDataKey =
      '_' + _.camelCase(this._name + '_objectsInFlight');
  },

  /**
   * @typedef {Object} HasMany~InFlightData
   * @property {Array.<Model>} add An array of objects to add to the
   * relationship.
   * @property {Array.<Model>} remove An array of objects to remove from the
   * relationship.
   * @property {Array.<Model>} save An array of objects that require saving
   * in order to properly save the relationship (join models fall into this
   * category).
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
      remove: [],
      associated: [], // inverse associated these
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
   * Implementation of {@link HasMany#beforeAssociatingObjects} for updating
   * caches.
   *
   * Note: this occurs after the adding of objects, but also when the inverse
   * association changes objects in the relationship.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeAssociatingObjects}
   */
  beforeAssociatingObjects: function(instance, objects/*, options*/) {
    var data = this._getInFlightData(instance);
    data.associated = _.union(data.associated, objects);
    data.associated = _.difference(data.associated, data.add);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
  },

  /**
   * Implementation of {@link HasMany#beforeDisassociatingObjects} for updating
   * caches.
   *
   * Note: this occurs after the removal of objects, but also when the inverse
   * association changes objects in the relationship.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeDisassociatingObjects}
   */
  beforeDisassociatingObjects: function(instance, objects/*, options*/) {
    var data = this._getInFlightData(instance);
    data.associated = _.difference(data.associated, objects);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
  },

  /**
   * Implementation of {@link HasMany#beforeCreatingObject} for updating
   * caches.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeCreatingObject}
   */
  beforeCreatingObject: function(instance, object) {
    var data = this._getInFlightData(instance);
    data.add = _.union(data.add, [object]);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
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
   * Implementation of {@link HasMany#beforeClearingObjects} for updating
   * caches.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeClearingObjects}
   */
  beforeClearingObjects: function(instance) {
    this._setInFlightData(instance, { clear: true, add: [], remove: [] });
    this._super.apply(this, arguments);
  },
});
