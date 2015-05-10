'use strict';

var Mixin = require('../../util/mixin');

/**
 * Model query mixin for core functionality (which must be present in all query
 * types that use any model query mixins).
 *
 * @mixin ModelCore
 */
module.exports = Mixin.create(/** @lends ModelCore# */ {

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._model = orig._model;
    this._modelTable = orig._modelTable;
    this._arrayTransform = orig._arrayTransform;
    this._modelTransform = orig._modelTransform;
    this._recreate = orig._recreate;
  },

  /**
   * Reset a bound query.
   *
   * This method allows bound queries to be reset/re-initialized. The
   * implementation here is provided as a default implementation so that it can
   * be called by any bound query mixin without regard to whether the query is
   * actually a bound query or has been spawned into a different query type
   * (select, update, etc).
   *
   * See {@link BoundQuery#_reset} for information regarding when you should
   * call this method in bound query mixins.
   *
   * @method
   * @protected
   * @return {ChainedQuery} The newly configured query.
   * @see {@link BoundQuery#_reset}
   */
  _reset: function() {
    return this._super() || this;
  },

  /**
   * Enable automatic conversion of the query results to model instances.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  autoload: function() {
    var model = this._model;
    var arrayTransform = function(result) { return result.rows; };
    var modelTransform = function(rows) {
      return rows.map(model.load.bind(model));
    };

    var dup = this._dup()
      .transform(arrayTransform)
      .transform(modelTransform);

    dup._arrayTransform = arrayTransform;
    dup._modelTransform = modelTransform;

    return dup;
  },

  /**
   * Disable automatic conversion of the query results to model instances.
   * Note that while this disables conversion to model instances, results
   * will still be transformed to arrays if {@link ModelCore#autoload} was
   * previously called.
   *
   * There's currently no way to disable the array conversion once the
   * `autoload` has completed (though it would be trivial to add if required).
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  noload: function() {
    var dup = this._dup();
    dup = dup.untransform(dup._modelTransform);
    return dup;
  },

  /**
   * No longer associate this query with a model class (disabling all model
   * related query features). This also disables the automatic conversion of
   * the query results to model instances, though the results will still be
   * returned as an array.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   * @see {@link ModelCore#noload}
   */
  unbind: function() {
    var dup = this._dup();
    dup = dup.noload();
    dup._model = undefined;
    return dup;
  }

});
