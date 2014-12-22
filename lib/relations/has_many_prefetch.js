'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var BluebirdPromise = require('bluebird');

/**
 * HasMany mixin for pre-fetching.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  associatePrefetch: function(instances, grouped, accumulated) {
    var self = this;
    if (this._options.through) {
      // console.log(accumulated);
      var throughRelations = this._throughRelations().reverse();
      // var sourceRelation = _.last(throughRelations);
      // var remainingThroughRelations = _.withoutLast(throughRelations);
      // console.log(throughRelations)

      instances.forEach(function(instance) {
        // console.log('want to find everything associated with:', instance, instance.pk);

        // var fk = instance
        var pks = _.map([instance], self.primaryKey);
        var objects;

        throughRelations.forEach(function(relation, index) {

          var group = accumulated[index];
          // console.log('looking for %j in ', pks, group);
          objects = pks.reduce(function(array, pk) {
            return _.union(array, group[pk]);
          }, []);


          // console.log('key is: %j', key);

          var nextRelation = throughRelations[index+1];
          if (nextRelation) {
            pks = _.map(objects, function(obj) {
              return obj.getAttribute(nextRelation.foreignKey);
            });
          }

          // var keys = _.map(transform, relation.primaryKey);
          // console.log(keys);

          // console.log(relation.primaryKey, relation.foreignKey)

        });
        // console.log(objects);
        self.associateFetchedObjects(instance, objects);

      });


    }
    else {
      instances.forEach(function(instance) {
        var pk = instance[self.primaryKey];
        var results = grouped[pk] || [];
        self.associateFetchedObjects(instance, results);
      });
    }

  },

  /**
   * Override of {@link BaseRelation#prefetch}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#prefetch}
   */
  prefetch: BluebirdPromise.method(function(instances) {
    console.log('%s#%s HasMany prefetch with %d instances',
      this._modelClass.__identity__.__name__, this._name, instances.length);

    if (instances.length === 0 || this._options.through) { return {}; }

    var self = this;
    var queryKey = this.foreignKey;
    var pks = _.map(instances, this.primaryKey);

    if (instances.length === 1) { pks = pks[0]; }
    else { queryKey += '[in]'; }

    var where = _.object([[queryKey, pks]]);
    var query = this._relatedModel.objects.where(where);

    return query.execute().then(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.getAttribute(self.foreignKey);
      });
      return grouped;
    });
  }),

});
