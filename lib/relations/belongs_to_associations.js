'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * HasMany mixin for associations.
 *
 * This mixin separates some of the logic of {@link BelongsTo} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends BelongsTo# */ {

  /**
   * Override of {@link BaseRelation#associate}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#associate}
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
   * Override of {@link BaseRelation#disassociate}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#disassociate}
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
