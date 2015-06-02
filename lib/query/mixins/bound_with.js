'use strict';

var _ = require('lodash');
var context = require('./bound_util').decorateRelationContext;
var Promise = require('bluebird');
var SelectQuery = require('./../select');
var Mixin = require('corazon/mixin');
var promiseMethod = Promise.method;


/**
 * Model query mixin for `with` support.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties & functionality from {@link ModelCore}.
 *   - It relies on methods from {@link ModelHelpers}. Reference that mixin for
 *     code & documentation.
 *
 * @mixin BoundWith
 */
module.exports = Mixin.create(/** @lends BoundWith# */ {
  init: function() {
    this._super.apply(this, arguments);
    this._prefetches = {};
  },

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._prefetches = _.clone(orig._prefetches);
  },

  /**
   * Override of {@link BaseQuery#_spawn}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_spawn}
   */
  _spawn: function(type) {
    if (!_.isEmpty(this._prefetches)) {
      this._validateSpawn(type, 'with', [SelectQuery]);
    }
    return this._super.apply(this, arguments);
  },

  /**
   * The pre-fetch cache is used to hold all pre-fetch results. All pre-fetch
   * method can read and write from it. The keys are association strings. The
   * values are the results from each pre-fetch, an object grouping
   * {@link Model} instances by the appropriate key, either `foreignKey` or
   * `primaryKey`, depending on the relation type.
   *
   * @typedef {Object} BoundWith~PrefetchCache
   * @see {@link BoundWith#_prefetch}
   */

  /**
   * Override of {@link BaseQuery#_process}. Performs a pre-fetch after the
   * execution.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_process}
   */
  _process: Promise.method(function() {
    return this._super.apply(this, arguments)
      .tap(this._prefetch.bind(this));
  }),

  /**
   * Perform all necessary pre-fetches.
   *
   * Uses the `_prefetches` object which contains the associations (stored in
   * the keys) to pre-fetch all relations that were specified via `with`. This
   * method expands any _through_ relations in the association, and starts a
   * {@link BoundWith#_prefetchAssociation} for each expanded association. A
   * cache will provided for each pre-fetch to fill. Pre-fetches will be
   * performed in order of shortest association string first (which means that
   * `articles` would be pre-fetched and have a chance to fill the cache before
   * `articles.comments` which is required).
   *
   * Once all pre-fetches have been completed, the original, unexpanded
   * associations will be used to associate objects on the relation through
   * {@link BoundWith#_associatePrefetchResults}.
   *
   * @method
   * @private
   * @param {Array.<Model>} records The records for which to pre-fetch.
   * @return {Promise} A promise that will resolve when the pre-fetch has
   * completed.
   */
  _prefetch: function(records) {
    var self = this;
    var cache = {};
    var associations = _.keys(this._prefetches);
    var expandedAssociations = _.sortBy(this._expandedPrefetches(), 'length');

    return Promise.each(expandedAssociations, function(association) {
      return self._prefetchAssociation(association, records, cache);
    })
    .return(associations)
    .each(function(association) {
      return self._associatePrefetchResults(association, records, cache);
    });
  },

  /**
   * Expand all associations marked for pre-fetching. All through relations in
   * the association will be expanded into actual relations. The resulting
   * array will contain unique values & no order is guaranteed.
   *
   * @method
   * @private
   * @return {Array.<String>} Relation key paths.
   */
  _expandedPrefetches: function() {
    var self = this;
    var associations = _.keys(this._prefetches);
    var expanded = [];
    associations.forEach(function(association) {
      self._relationForEach(association, function(assoc, rel, details) {
        var isThrough = (details.through && !details.expanded);
        if (!isThrough) {
          expanded.push(assoc);
        }
      });
    });
    return _.uniq(expanded);
  },


  /**
   * Pre-fetch records for a single association & cache the result.
   *
   * @method
   * @private
   * @param {String} association Relation key path.
   * @param {Array.<Model>} records The records being pre-fetched.
   * @param {BoundWith~PrefetchCache} cache The pre-fetch cache.
   * @return {Promise} A promise that will resolve when pre-fetching has
   * completed.
   */
  _prefetchAssociation: promiseMethod(function(association, records, cache) {
    var relation = this._findPrefetchRelation(association);
    var prevAssociation = _.initial(association.split('.')).join('.');
    var prevRecords = records;
    if (prevAssociation) {
      prevRecords = _(cache[prevAssociation])
        .values()
        .flatten()
        .value();
    }

    return relation.prefetch(prevRecords).then(function(result) {
      cache[association] = result;
    });
  }),

  /**
   * Find a relation for pre-fetching.
   *
   * @method
   * @private
   * @param {String} association Relation key path.
   * @return {Relation} The relation to use for pre-fetching.
   */
  _findPrefetchRelation: function(association) {
    var relation;

    this._relationForEach(association, function(assoc, rel) {
      if (assoc === association) {
        relation = rel;
      }
    });

    return relation;
  },

  /**
   * Associates pre-fetch results via
   * {@link BaseRelation#associatePrefetchResults}. Pre-fetched values will be
   * loaded from the cache. Each relation in the association string, one after
   * the other, will have it's `associatePrefetchResults` method called. The
   * objects passed to each `associatePrefetchResults` call will begin with the
   * set of objects that are given to the method (usually those returned from
   * the execution of this query). Each subsequent call will use pre-fetch
   * result objects from the cache.
   *
   * @method
   * @private
   * @param {String} association Relation key path.
   * @param {Array.<Model>} records The records being pre-fetched.
   * @param {BoundWith~PrefetchCache} cache The pre-fetch cache.
   */
  _associatePrefetchResults: function(association, records, cache) {
    var currentRecords = records;
    var accumulated = []; // accumulates data between each associate call

    this._relationForEach(association, function(assoc, rel, details) {
      var relation = details.through || rel;
      var prefetchResult = cache[assoc];

      // accumulate each pre-fetch result (until associate call is made).
      accumulated.push(prefetchResult);

      // associate only relations that are actually part of the association
      // string. whether it's part of the association string can easily be
      // determined from the index, which, when positive means that it's not a
      // part of a through association that's being traversed.
      var associate = (details.index >= 0);
      if (associate) {
        relation.associatePrefetchResults(currentRecords,
          prefetchResult, accumulated);

        // now that an association has been performed, reset the accumulated &
        // currentRecords values.
        var newRecords = _(prefetchResult)
          .values()
          .flatten()
          .value();

        currentRecords = newRecords;
        accumulated = [];
      }
    });
  },

  /**
   * Pre-fetch related objects.
   *
   * @method
   * @public
   * @param {...String} association The name of the relation to pre-fetch.
   * @return {ChainedQuery} The newly configured query.
   */
  with: function(/*association...*/) {
    if (!this._model) {
      throw new Error('Cannot perform `with` on unbound query.');
    }
    return _.reduce(arguments, function(query, association) {
      return query._withAssociation(association);
    }, this._dup());
  },

  /**
   * Pre-fetch for a specific association.
   *
   * @param {String} association Relation key path.
   * @return {ChainedQuery} The newly configured query.
   */
  _withAssociation: context('with', function(association) {

    // iterate the relation just to ensure that it's usable before storing it.
    this._relationForEach(association, _.noop);

    var dup = this._dup();
    dup._prefetches[association] = true;
    return dup;
  }),

});
