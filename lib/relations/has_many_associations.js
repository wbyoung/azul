'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * HasMany mixin for associations.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/* lends HasMany# */{

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
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
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  associate: function(instance, relatedObject, options) {
    this.associateObjects(instance, [relatedObject], options);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
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
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  disassociate: function(instance, relatedObject, options) {
    this.disassociateObjects(instance, [relatedObject], options);
  }

});
