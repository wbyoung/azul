'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

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
   * @method
   * @protected
   * @see {@link BaseRelation#prefetch}
   */
  prefetch: function(instances) {
    console.log('%s#%s prefetch with %d instances',
      this._modelClass.__identity__.__name__, this._name, instances.length);

    if (instances.length === 0) { return []; }

    var self = this;
    var pks = _.map(instances, this.primaryKey);
    var query = this.scopeObjectQuery(this._relatedModel.objects, pks);
    return query.execute().tap(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.getAttribute(self.foreignKey);
      });
      instances.forEach(function(instance) {
        var pk = instance[self.primaryKey];
        var results = grouped[pk] || [];
        self.associateFetchedObjects(instance, results);
      });
    });
  },

});
