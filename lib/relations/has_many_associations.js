'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * HasMany mixin for associations.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Specific method for associating objects that have just been fetched
   * from the database.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects to add to the association.
   * @see {@link HasMany~AssociationsMixin}
   */
  associateFetchedObjects: function(instance, objects) {
    this.associateObjects(instance, objects, { attrs: false });
  },

  /**
   * Associate multiple objects. For performance reasons, this is preferred
   * over simply associating each object individually.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects to add to the association.
   * @param {Object} [options] Options. See {@link BaseRelation#associate}.
   */
  associateObjects: function(instance, objects, options) {
    var opts = _.defaults({}, options, { follow: true, attrs: true });

    objects.forEach(function(relatedObject) {
      if (opts.attrs) {
        // always set foreign key in case the inverse relation does not exist
        relatedObject.setAttribute(this.foreignKey, instance.id);
      }

      var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];
      if (inverse) {
        inverse.associate(relatedObject, instance, _.extend({}, options, {
          follow: false
        }));
      }
    }, this);
  },

  /**
   * Override of {@link BaseRelation#associate}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#associate}
   */
  associate: function(instance, relatedObject, options) {
    this.associateObjects(instance, [relatedObject], options);
  },

  /**
   * Disassociate multiple objects. For performance reasons, this is preferred
   * over simply disassociating each object individually.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects to remove from the association.
   * @param {Object} [options] Options. See {@link BaseRelation#disassociate}.
   */
  disassociateObjects: function(instance, objects, options) {
    var opts = _.defaults({}, options, { follow: true, attrs: true });

    objects.forEach(function(relatedObject) {
      if (opts.attrs) {
        // always set foreign key in case the inverse relation does not exist
        relatedObject.setAttribute(this.foreignKey, undefined);
      }

      var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];
      if (inverse) {
        inverse.disassociate(relatedObject, instance, _.extend({}, options, {
          follow: false
        }));
      }
    }, this);
  },

  /**
   * Override of {@link BaseRelation#disassociate}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#disassociate}
   */
  disassociate: function(instance, relatedObject, options) {
    this.disassociateObjects(instance, [relatedObject], options);
  }

});
