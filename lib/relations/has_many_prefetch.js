'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * HasMany mixin for pre-fetching.
 *
 * @mixin HasMany~PrefetchMixin
 */
module.exports = Mixin.create(/* lends HasMany~PrefetchMixin */{

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
    var queryKey = this.foreignKey;
    var pks = _.map(instances, this.primaryKey);

    if (instances.length === 1) { pks = pks[0]; }
    else { queryKey += '[in]'; }

    var where = _.object([[queryKey, pks]]);
    var query = this._relatedModel.objects.where(where);

    return query.execute().then(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.attrs[self.foreignKey];
      });
      instances.forEach(function(instance) {
        var pk = instance[self.primaryKey];
        var results = grouped[pk] || [];
        self.associateFetchedObjects(instance, results);
      });
    });
  },

});
