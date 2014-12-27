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

  /**
   * Override of {@link BaseRelation#prefetchAssociate}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#prefetchAssociate}
   */
  prefetchAssociate: function(instances, grouped, accumulated) {
    // TODO: refactor
    var self = this;
    if (this._options.through) { // TODO: move option access to `has_many_through.js`
      var throughRelations = this._throughRelations().reverse();
      instances.forEach(function(instance) {
        var pks = _.map([instance], self.primaryKey);
        var objects;
        throughRelations.forEach(function(relation, index) {
          var group = accumulated[index];
          objects = pks.reduce(function(array, pk) {
            return _.union(array, group[pk]);
          }, []);

          var nextRelation = throughRelations[index+1];
          if (nextRelation) {
            pks = _.map(objects, function(obj) {
              return obj.getAttribute(nextRelation.joinKey);
            });
          }
        });
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
