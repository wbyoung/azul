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
    var opts = _.defaults({}, options, { follow: true });
    var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];

    // TODO: don't use the cache key here. also, is this stuff
    // even needed?
    if (instance[this._itemCacheKey] || instance[this._foreignKeyProperty]) {
      // cause remove
    }

    if (relatedObject) {
      // cause an add
    }

    // set the foreign key property as well
    instance[this.foreignKeyProperty] = relatedObject[this.primaryKey];


    this._setRelated(instance, relatedObject);

    if (inverse) {
      inverse.associate(relatedObject, instance, { follow: false });
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
    var opts = _.defaults({}, options, { follow: true });
    var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];

    // set the foreign key property as well
    instance[this.foreignKeyProperty] = undefined;

    this._setRelated(instance, undefined);

    if (inverse) {
      inverse.associate(relatedObject, instance, { follow: false });
    }
  },

});