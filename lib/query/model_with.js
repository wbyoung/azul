'use strict';

var _ = require('lodash');
var context = require('./model_util').decorateRelationContext;
var BluebirdPromise = require('bluebird');
var SelectQuery = require('./select');
var Mixin = require('../util/mixin');

/**
 * ModelQuery mixin for `with` support.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on methods from the ModelQuery Helpers mixin. Reference that
 *     mixin for code & documentation.
 *
 * This mixin separates some of the logic of {@link ModelQuery} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends ModelQuery# */ {

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   */
  _create: function() {
    this._super.apply(this, arguments);
    this._prefetches = [];
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
    this._prefetches = orig._prefetches.slice(0);
  },

  /**
   * Override of {@link BaseQuery#_spawn}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_spawn}
   */
  _spawn: function(type) {
    if (this._prefetches.length) {
      this._validateSpawn(type, 'with', [SelectQuery]);
    }
    return this._super.apply(this, arguments);
  },

  /**
   * Override of {@link BaseQuery#_execute}. Performs a pre-fetch after the
   * execution.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_execute}
   */
  _execute: function() {
    return this._super()
      .tap(this._prefetch.bind(this));
  },

  /**
   * @typedef {Array.<ModelQuery~PrefetchChain>} ModelQuery~PrefetchArray
   * @see {@link ModelQuery#_prefetch}
   */

  /**
   * Perform all necessary pre-fetches.
   *
   * Uses the `_prefetches` array, a {@link ModelQuery~PrefetchArray} to
   * pre-fetch all relations that were specified via `with`. This method really
   * just kicks off the start of a {@link ModelQuery#_prefetchChain} using the
   * records that was passed to it.
   *
   * @method
   * @private
   * @param {Array.<Model>} records The records for which to pre-fetch.
   * @return {Promise} A promise that will resolve when the pre-fetch has
   * completed.
   * @see {@link ModelQuery~PrefetchArray}
   */
  _prefetch: function(records) {
    var self = this;
    var fn = function(chain) { return self._prefetchChain(chain, records); };
    return BluebirdPromise.map(this._prefetches, fn);
  },

  /**
   * @typedef {Array.<ModelQuery~PrefetchItem>} ModelQuery~PrefetchChain
   * @see {@link ModelQuery#_prefetchChain}
   */

  /**
   * @typedef {Object} ModelQuery~PrefetchItem
   * @property {Relation} relation The actual relation that performs the
   * pre-fetch.
   * @property {Boolean} associate Whether this relation should be associated.
   * @see {@link ModelQuery#_prefetchChain}
   */

  /**
   * Pre-fetch records through a chain of relations.
   *
   * Handles an array of relations that should be prefetched, one after the
   * other. Each relation will have it's `prefetch` method called. The objects
   * passed to each `prefetch` call will begin with the set of objects that
   * are given to the method (usually those returned from the execution of this
   * query). Each subsequent call will use the resulting set of objects from
   * the previous `prefetch`, creating a chain that can be used to follow a
   * chain of relationships.
   *
   * @method
   * @private
   * @param {ModelQuery~PrefetchChain} chain The chain of relations for which
   * pre-fetching should occur.
   * @param {Array.<Model>} records The records for which to pre-fetch.
   * @return {Promise} A promise that will resolve when pre-fetching has
   * completed.
   */
  _prefetchChain: function(chain, records) {
    // TODO: refactor
    var accumulated = [];
    var recordsToAssociate = records;
    return BluebirdPromise.reduce(chain, function(recordsFromPrevious, item) {
      var relation = item.relation;
      var associate = item.associate;
      return relation.prefetch(recordsFromPrevious).then(function(grouped) {
        var flattenedRecords = _(grouped).values().flatten(true).value();
        accumulated.push(grouped);
        if (associate) {
          relation.associatePrefetch(recordsToAssociate, grouped, accumulated);
          accumulated = [];
          recordsToAssociate = flattenedRecords;
        }
        return flattenedRecords;
      });
    }, records);
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
    return _.reduce(arguments, function(query, association) {
      return query._withAssociation(association);
    }, this._dup());
  },

  /**
   * Pre-fetch for a specific association.
   *
   * @param {String} association Relation key path.
   * @return {ChainedQuery} The newly configured query.
   * @see {@link ModelQuery~PrefetchArray}
   */
  _withAssociation: context('with', function(association) {
    var prefetchChain = [];

    // TODO: a simpler look at the association could make more sense (not going
    // though the through associations).
    // var prefetchChain = this._associationMap(association, function(assoc) {
    //   return this._lookupRelation(assoc, 'with');
    // }, this);

    // TODO: refactor
    this._relationForEach(association, function(assoc, rel, through, index) {
      var associate = (index >= 0) && !through;
      prefetchChain.push({ relation: rel, associate: associate });
      if (through && index >= 0) {
        prefetchChain.push({ relation: through, associate: true });
      }
    });

    var dup = this._dup();
    dup._prefetches.push(prefetchChain);
    return dup;
  }),

});
