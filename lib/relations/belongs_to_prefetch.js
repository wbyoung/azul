'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Promise = require('bluebird');

/**
 * BelongsTo mixin for pre-fetching.
 *
 * This mixin separates some of the logic of {@link BelongsTo} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends BelongsTo# */ {

  /**
   * Override of {@link BaseRelation#prefetch}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#prefetch}
   */
  prefetch: Promise.method(function(instances) {
    if (instances.length === 0) { return {}; }

    var self = this;
    var queryKey = this.primaryKey;
    var foreignKeyAttr = this.foreignKeyAttr;
    var fks = _(instances)
      .map(function(instance) { return instance.getAttribute(foreignKeyAttr); })
      .uniq()
      .reject(_.isUndefined)
      .reject(_.isNull)
      .value();

    var limit = fks.length;

    if (fks.length === 1) { fks = fks[0]; }
    else { queryKey += '$in'; }

    var where = _.object([[queryKey, fks]]);
    var query = this._relatedModel.objects.where(where).limit(limit);

    return query.execute().then(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.getAttribute(self.primaryKeyAttr);
      });
      instances.forEach(function(instance) {
        var fk = instance.getAttribute(foreignKeyAttr);
        var results = grouped[fk] || [];
        self.validateFetchedObjects(instance, results);
      });
      return grouped;
    });
  }),

  /**
   * Override of {@link BaseRelation#associatePrefetchResults}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#associatePrefetchResults}
   */
  associatePrefetchResults: function(instances, grouped) {
    instances.forEach(function(instance) {
      var fk = instance.getAttribute(this.foreignKeyAttr);
      var results = grouped[fk] || [];
      this.associateFetchedObjects(instance, results);
    }, this);
  },

});
