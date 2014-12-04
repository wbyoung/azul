'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * HasMany mixin for associations.
 *
 * @mixin HasMany~AssociationsMixin
 */
module.exports = Mixin.create(/* lends HasMany~AssociationsMixin */{

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  associateObjects: function(instance, objects, options) {
    var opts = _.defaults({}, options, { follow: true });

    objects.forEach(function(relatedObject) {
      // TODO: write tests for the following cases:
      //   4. the order for setting values is db attribute before inverse property.

      // always set foreign key in case the inverse relation does not exist
      relatedObject.setAttribute(this.foreignKey, instance.id);

      var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];
      if (inverse) {
        inverse.associate(relatedObject, instance, { follow: false });
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
    var opts = _.defaults({}, options, { follow: true });

    objects.forEach(function(relatedObject) {
      // always set foreign key in case the inverse relation does not exist
      relatedObject.setAttribute(this.foreignKey, undefined);

      var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];
      if (inverse) {
        inverse.disassociate(relatedObject, instance, { follow: false });
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
