'use strict';

var _ = require('lodash');
var BaseRelation = require('./base');
var property = require('corazon/property');

/**
 * An inverse relation for relations that do not have explicit inverses.
 *
 * This is used in certain circumstances (for instance, supporting shortcut
 * lookups on has-many-through relationships) where the inverse must be known
 * in order to relate the data, but there is no reason to require the user to
 * specify the inverse.
 *
 * If, for instance, you had a {@link BelongsTo} relationship, where an article
 * belongs to an author. The relationship can easily join authors on articles.
 * The resulting query would look something like:
 * `... INNER JOIN "authors" ON "articles"."author_id" = "authors"."id"`. If
 * If instead, you needed to use the same {@link BelongsTo} relation to query
 * for authors joined with articles, and the user has not specified the
 * {@link HasMany} relationship, you would need a placeholder inverse
 * relationship to form the query. {@link BaseRelation#inverseRelation} creates
 * the relationship, and a join can easily produce:
 * `... INNER JOIN "articles" ON "articles"."author_id" = "authors"."id"`.
 *
 * @protected
 * @constructor InverseRelation
 * @extends BaseRelation
 * @see {@link BaseRelation#inverseRelation}
 */
var InverseRelation = BaseRelation.extend(/** @lends InverseRelation# */ {
  init: function() {
    throw new Error('InverseRelation cannot be initialized directly');
  },

  /**
   * Override of {@link BaseRelation#joinKey}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#joinKey}
   */
  joinKey: property(function() {
    return this._inverse.inverseKey;
  }),

  /**
   * Override of {@link BaseRelation#joinKeyAttr}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#joinKeyAttr}
   */
  joinKeyAttr: property(function() {
    return this._inverse.inverseKeyAttr;
  }),

  /**
   * Override of {@link BaseRelation#inverseKey}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#inverseKey}
   */
  inverseKey: property(function() {
    return this._inverse.joinKey;
  }),

  /**
   * Override of {@link BaseRelation#inverseKeyAttr}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#inverseKeyAttr}
   */
  inverseKeyAttr: property(function() {
    return this._inverse.joinKeyAttr;
  }),

  /**
   * Override of {@link BaseRelation#joinCondition}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#joinCondition}
   */
  joinCondition: function(baseTable, joinTable) {
    return this._inverse.joinCondition(joinTable, baseTable);
  },

});

BaseRelation.reopen(/** @lends BaseRelation# */ {

  /**
   * Get the inverse relationship for this relationship. If such a relationship
   * has not been defined, generate an {@link InverseRelationship} placeholder
   * that models how the inverse would be configured.
   *
   * @method
   * @public
   * @scope internal
   * @return {BaseRelation}
   */
  inverseRelation: function() {
    var prototype = this._relatedModel.__class__.prototype;
    var inverse = prototype[this.inverse + 'Relation'];

    if (!inverse) {
      inverse = InverseRelation.new();
      inverse._relatedModel = this._modelClass;
      inverse._modelClass = this._relatedModel;
      inverse._name = _.camelCase(this._name + 'Inverse');
      inverse._inverse = this;
    }
    return inverse;
  },

});

module.exports = InverseRelation.reopenClass({ __name__: 'InverseRelation' });
