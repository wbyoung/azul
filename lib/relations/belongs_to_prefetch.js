'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * BelongsTo mixin for pre-fetching.
 *
 * This mixin separates some of the logic of {@link BelongsTo} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/* lends BelongsTo# */{

  /**
   * Override of {@link BaseRelation#prefetch}.
   *
   * @protected
   * @method
   * @see {@link BaseRelation#prefetch}
   */
  prefetch: function(instances) {
    if (instances.length === 0) { return; }

    var self = this;
    var queryKey = this.primaryKey;
    var foreignKey = this.foreignKey;
    var fks = _(instances)
      .map(function(instance) { return instance.getAttribute(foreignKey); })
      .uniq()
      .reject(_.isUndefined)
      .reject(_.isNull)
      .value();

    var limit = fks.length;

    if (fks.length === 1) { fks = fks[0]; }
    else { queryKey += '[in]'; }

    var where = _.object([[queryKey, fks]]);
    var query = this._relatedModel.objects.where(where).limit(limit);

    return query.execute().then(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.attrs[self.primaryKey];
      });
      instances.forEach(function(instance) {
        var fk = instance.getAttribute(foreignKey);
        var results = grouped[fk] || [];
        self.validateFetchedObjects(instance, results);
        self.associateFetchedObjects(instance, results);
      });
    });
  },

});
