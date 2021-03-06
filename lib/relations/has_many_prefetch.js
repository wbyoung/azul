'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Promise = require('bluebird');

/**
 * HasMany mixin for pre-fetching.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Override of {@link BaseRelation#prefetch}.
   *
   * Mixins can override {@link HasMany#prefetch} to change the way pre-fetch
   * is performed. This is the default implementation.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#prefetch}
   */
  _prefetch: Promise.method(function(instances) {
    if (instances.length === 0) { return {}; }

    var self = this;
    var query = this._prefetchQuery(instances);
    return query.execute().then(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.getAttribute(self.foreignKeyAttr);
      });
      return grouped;
    });
  }),

  /**
   * Generate the prefetch query.
   *
   * Subclasses can override this.
   *
   * @method
   * @protected
   * @see {@link HasMany#_prefetch}
   */
  _prefetchQuery: function(instances) {
    var queryKey = this.foreignKey;
    var pks = _.map(instances, this.primaryKey);

    if (instances.length === 1) { pks = pks[0]; }
    else { queryKey += '$in'; }

    var where = _.object([[queryKey, pks]]);
    return this._relatedModel.objects.where(where);
  },

  /**
   * Override of {@link BaseRelation#associatePrefetchResults}.
   *
   * Mixins can override {@link HasMany#associatePrefetchResults} to change the
   * way pre-fetch association is performed. This is the default
   * implementation.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#associatePrefetchResults}
   */
  _associatePrefetchResults: function(instances, grouped) {
    instances.forEach(function(instance) {
      var pk = instance.getAttribute(this.primaryKeyAttr);
      var results = grouped[pk] || [];
      this.associateFetchedObjects(instance, results);
    }, this);
  },

});
