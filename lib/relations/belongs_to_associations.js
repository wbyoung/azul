'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * HasMany mixin for associations.
 *
 * @mixin BelongsTo~AssociationsMixin
 */
module.exports = Mixin.create(/* lends BelongsTo~AssociationsMixin */ {

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  associate: function(instance, relatedObject, options) {
    var opts = _.defaults({}, options, { follow: true, attrs: true });
    var inverse = opts.follow && relatedObject &&
      relatedObject[this.inverse + 'Relation'];

    if (opts.attrs) {
      // set the foreign key property as well
      instance.setAttribute(this.foreignKey, relatedObject[this.primaryKey]);
    }

    this._setRelated(instance, relatedObject);

    if (inverse) {
      inverse.associate(relatedObject, instance, _.extend({}, options, {
        follow: false
      }));
    }
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  disassociate: function(instance, relatedObject, options) {
    var opts = _.defaults({}, options, { follow: true, attrs: true });
    var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];

    if (opts.attrs) {
      // set the foreign key property as well
      instance.setAttribute(this.foreignKey, undefined);
    }

    this._setRelated(instance, undefined);

    if (inverse) {
      inverse.disassociate(relatedObject, instance, _.extend({}, options, {
        follow: false
      }));
    }
  },

});
