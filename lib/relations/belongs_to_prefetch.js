'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * HasMany mixin for pre-fetching.
 *
 * @mixin BelongsTo~PrefetchMixin
 */
module.exports = Mixin.create(/* lends BelongsTo~PrefetchMixin */{

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  prefetch: function(instances) {
    if (instances.length === 0) { return; }

    var self = this;
    var queryKey = this.primaryKey;
    var fks = _(instances)
      .map(this.foreignKeyProperty)
      .uniq()
      .reject(_.isUndefined)
      .reject(_.isNull)
      .value();

    if (fks.length === 1) { fks = fks[0]; }
    else { queryKey += '[in]'; }

    var where = _.object([[queryKey, fks]]);
    var query = this._relatedModel.objects.where(where);

    return query.execute().then(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.attrs[self.primaryKey];
      });
      instances.forEach(function(instance) {
        var fk = instance[self.foreignKeyProperty];
        var results = grouped[fk] || [];
        // TODO: perhaps this method should be renamed to be more similar to
        // the has-many method. what's actually happening is that it's caching
        // the related object, not really setting it.
        self._setRelated(instance, results[0]);
      });
    });
  },

});
