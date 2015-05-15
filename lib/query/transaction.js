'use strict';

var _ = require('lodash');
var util = require('util');
var BaseQuery = require('./base');
var Mixin = require('../util/mixin');
var BluebirdPromise = require('bluebird');

/**
 * Create a transaction object. This is still technically part of a query
 * chain, but the resulting query is not executable. It provides methods that
 * allow you to create executable queries. Like all other methods that begin a
 * query chain, this method is intended to be called only once and is mutually
 * exclusive with those methods.
 *
 * @method EntryQuery#transaction
 * @public
 * @return {TransactionQuery} The newly configured query.
 */

/**
 * A transaction is the building block of Azul's transaction support.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#transaction}.
 *
 * While not executable, it does carry with it the base query attributes that
 * have been set before it was spawned.
 *
 * @protected
 * @constructor
 */
var TransactionQuery = BaseQuery.extend()

var BeginQuery = BaseQuery.extend();
var CommitQuery = BaseQuery.extend();
var RollbackQuery = BaseQuery.extend();

TransactionQuery.reopenClass({
  BeginQuery: BeginQuery,
  CommitQuery: CommitQuery,
  RollbackQuery: RollbackQuery,
});

TransactionQuery.reopen(/** @lends TransactionQuery# */ {
  init: function() { throw new Error('TransactionQuery must be spawned.'); },

  /**
   * Acquire a client.
   *
   * This will acquire a client for the transaction if one has not already been
   * acquired. It will also register a change in the depth of the transaction
   * if you pass the appropriate option. Depth represents how deep your are in
   * `BEGIN` statements that have not be balanced by `COMMIT` or `ROLLBACK`
   * statements.
   *
   * @method
   * @public
   * @scope internal
   * @param {Object} [options]
   * @param {Number} [options.depthChange] The change in depth for this
   * acquisition.
   */
  acquireClient: BluebirdPromise.method(function(options) {
    var opts = _.defaults({}, options, {
      depthChange: 0
    });

    this._validateDepth(options);
    this._depth = (this._depth || 0) + opts.depthChange;
    this._clientPromise = this._clientPromise ||
      this._adapter.pool.acquireAsync();

    return this._clientPromise;
  }),

  /**
   * Release a client.
   *
   * This will release the client from the transaction if it is no longer
   * needed.
   *
   * @method
   * @public
   * @scope internal
   */
  releaseClient: BluebirdPromise.method(function() {
    var result;
    if (this._clientPromise && this._depth === 0) {
      var pool = this._adapter.pool;
      var clear = function() {
        this._clientPromise = undefined;
        this._closed = true;
      }.bind(this);

      result = this._clientPromise
        .tap(pool.release.bind(pool))
        .tap(clear);
    }
    return result;
  }),

  /**
   * Validate the depth of this transaction.
   *
   * This is intended to be used just before changing the depth and will throw
   * an error if the change is not allowed.
   *
   * @param {Object} options The same options as `acquireClient`.
   */
  _validateDepth: function(options) {
    var opts = _.defaults({}, options, {
      depthChange: 0
    });

    var change = opts.depthChange;
    var depth = this._depth || 0;

    if (depth <= 0 && change <= 0) {
      throw new Error('Attempt to execute query with transaction that is ' +
        'not open.');
    }
  },

  /**
   * Create a begin query.
   *
   * The resulting object is a query that must be executed to actually perform
   * the begin.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  begin: function() {
    return this._spawn(BeginQuery, [this]);
  },

  /**
   * Create a commit query.
   *
   * The resulting object is a query that must be executed to actually perform
   * the commit.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  commit: function() {
    return this._spawn(CommitQuery, [this]);
  },

  /**
   * Create a rollback query.
   *
   * The resulting object is a query that must be executed to actually perform
   * the rollback.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  rollback: function() {
    return this._spawn(RollbackQuery, [this]);
  }

});


/**
 * Transaction action mixin.
 *
 * This provides the shared functionality of {@link BeginQuery},
 * {@link CommitQuery}, and {@link RollbackQuery}.
 *
 * @mixin TransactionAction
 */
var TransactionAction = Mixin.create({

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Database#select} for parameter details.
   */
  _create: function(transaction, type, change) {
    this._transaction = transaction;
    this._type = type;
    this._change = change;
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
    this._transaction = orig._transaction;
    this._type = orig._type;
    this._change = orig._change;
  },

  /**
   * Override of {@link BaseQuery#_client}.
   *
   * @private
   * @see {@link BaseQuery#_client}
   */
  _client: BluebirdPromise.method(function() {
    return this._transaction.acquireClient({ depthChange: this._change });
  }),

  /**
   * Override of {@link BaseQuery#_process}.
   *
   * @private
   * @see {@link BaseQuery#_process}
   */
  _process: BluebirdPromise.method(function(result) {
    return this._transaction.releaseClient()
      .then(this._super.bind(this, result));
  }),

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return this._adapter.phrasing[this._type]();
  }

});

/**
 * An begin query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link TransactionQuery#begin}.
 *
 * @protected
 * @constructor BeginQuery
 * @extends BaseQuery
 * @mixes TransactionAction
 */
BeginQuery.reopen(TransactionAction);
BeginQuery.reopen({
  init: function() { throw new Error('BeginQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Database#select} for parameter details.
   */
  _create: function(transaction) { this._super(transaction, 'begin', 1); },
});
BeginQuery.reopenClass({ __name__: 'BeginQuery' });

/**
 * An commit query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link TransactionQuery#commit}.
 *
 * @protected
 * @constructor CommitQuery
 * @extends BaseQuery
 * @mixes TransactionAction
 */
CommitQuery.reopen(TransactionAction);
CommitQuery.reopen({
  init: function() { throw new Error('CommitQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Database#select} for parameter details.
   */
  _create: function(transaction) { this._super(transaction, 'commit', -1); },
});
CommitQuery.reopenClass({ __name__: 'CommitQuery' });

/**
 * An rollback query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link TransactionQuery#rollback}.
 *
 * @protected
 * @constructor RollbackQuery
 * @extends BaseQuery
 * @mixes TransactionAction
 */
RollbackQuery.reopen(TransactionAction);
RollbackQuery.reopen({
  init: function() { throw new Error('RollbackQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Database#select} for parameter details.
   */
  _create: function(transaction) { this._super(transaction, 'rollback', -1); },
});
RollbackQuery.reopenClass({ __name__: 'RollbackQuery' });

module.exports = TransactionQuery.reopenClass({ __name__: 'TransactionQuery' });
