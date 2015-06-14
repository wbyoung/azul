'use strict';

var _ = require('lodash');
var util = require('util');
var inflection = require('../util/inflection');
var Promise = require('bluebird');
var Mixin = require('corazon/mixin');

/**
 * A wrapper function for overriding methods & taking action only when the
 * relation was set up with the `through` option enabled.
 *
 * @function HasMany~throughOverride
 * @param {Function} fn The method to call if this is a through relation.
 * @return {Function} The wrapper method.
 */
var override = function(fn) {
  return function() {
    if (this._options.through) {
      return fn.apply(this, arguments);
    }
    else {
      return this._super.apply(this, arguments);
    }
  };
};

/**
 * A convenience function for creating a through-only method override that will
 * throw an exception if this is not a through relation configured as a simple
 * many-to-many.
 *
 * @function HasMany~manyToManyOnly
 * @param {String} message The error message prefix.
 * @return {Function} The method.
 * @see {@link HasMany~throughOverride}
 */
var manyToManyOnly = function(message) {
  return override(function() {
    if (!this._isToMany()) {
      var modelName = this._modelClass.__identity__.__name__;
      var relationName = this._name;
      throw new Error(util.format('%s for non many-to-many through relation ' +
        '%s#%s.', message, modelName, relationName));
    }
    return this._super.apply(this, arguments);
  });
};


/**
 * HasMany mixin for through support.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Override of {@link BaseRelation#init}.
   *
   * @method
   * @protected
   * @param {String} [options.join] Simply an alias for join.
   * @see {@link BaseRelation#init}
   */
  init: function() {
    this._super.apply(this, arguments);
    this._options = _.defaults({}, this._options);

    // apply complex defaults to options
    if (this._options.join) {
      this._options.through = this._options.join;
    }
    if (this._options.through) {
      this._options.through = inflection.pluralize(this._options.through);
      this._options.through = _.camelCase(this._options.through);
    }
  },

  configure: override(function() {
    var implicit = this._options.implicit;

    // when specifying a _through_ relation, it may be a _through_ relation to
    // a join table to set up a many to many relationship. defining two
    // `hasMany` relations every time you want to set up a many to many
    // relationship would be tedious. we therefore assume that if `through` is
    // specified, and the relationship can be made into a many-to-many
    // relationship (that is, other defined relations do not make it a shortcut
    // style through relationship), that it should be. the necessary `hasMany`
    // and `belongsTo` relations will be added as needed.

    // this can be made into a many-to-many relationship if `_isToMany` returns
    // undefined (rather than true/false). if it can be, now's the time to add
    // the implicit `hasMany` and/or `belongsTo` relationships.
    var canBeToMany = (this._isToMany() === undefined);

    if (canBeToMany && !implicit) {
      var through = this._options.through;
      var source = inflection.singularize(this._options.source || this._name);
      var modelClass = this._modelClass;
      var joinModel = this._joinModel();
      var db = modelClass.db;

      var throughRelation = modelClass[through + 'Relation'];
      if (!throughRelation) {
        var hasManyAttr = db.hasMany(joinModel, { implicit: true });
        var hasManyAttrs = _.object([[through, hasManyAttr]]);
        modelClass.reopen(hasManyAttrs);
      }

      var sourceRelation = joinModel[source + 'Relation'];
      if (!sourceRelation) {
        var belongsToModel = this._relatedModel;
        var belongsToAttr = db.belongsTo(belongsToModel, { implicit: true });
        var belongsToAttrs = _.object([[source, belongsToAttr]]);
        joinModel.reopen(belongsToAttrs);
      }
    }

    this._super();
  }),

  /**
   * Override of {@link HasMany#inverseDefault} that ensures that many-to-many
   * through relationships have an inverse, but all other types do not have an
   * inverse.
   *
   * @method
   * @protected
   * @see {@link HasMany#inverseDefault}
   */
  inverseDefault: override(function() {
    var inverse;
    if (this._isToMany()) {
      var sourceRelation = this._expand().reverse()[0];
      var sourcesInverse = sourceRelation.inverseRelation();
      var match = _.find(this._relatedModel.relations, function(relation) {
        return relation._options.through === sourcesInverse._name;
      }.bind(this));
      inverse = _.get(match, '_name');
    }
    return inverse;
  }),

  /**
   * Override of {@link HasMany#foreignKeyDefault} that ensures that
   * many-to-many through relationships do not have a foreign key attribute.
   * That's only accessible via the through relationship.
   *
   * @method
   * @protected
   * @see {@link HasMany#inverseDefault}
   */
  foreignKeyDefault: override(function() {
    return undefined;
  }),

  /**
   * Override of {@link BaseRelation#expand} that publicly exposes the
   * relations off of which this is built.
   *
   * @method
   * @private
   * @scope internal
   * @see {@link BaseRelation#expand}
   */
  expand: function() {
    return this._expand();
  },

  /**
   * Get all relations from the this relation (not inclusive) to the source
   * relation (inclusive).
   *
   * @method
   * @private
   * @return {Array.<BaseRelation>}
   */
  _expand: function() {
    var details = this._expansionDetails();
    if (details.error) {
      throw details.error;
    }
    return details.relations;
  },

  /**
   * Handle create object for through relations by ensuring it only works for
   * many-to-many through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#clearObjects}
   */
  createObject: manyToManyOnly('Cannot create object'),

  /**
   * Handle add objects for through relations by ensuring it only works for
   * many-to-many through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#clearObjects}
   */
  addObjects: manyToManyOnly('Cannot add objects'),

  /**
   * Handle remove objects for through relations by ensuring it only works for
   * many-to-many through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#clearObjects}
   */
  removeObjects: manyToManyOnly('Cannot remove objects'),

  /**
   * Handle clear objects for through relations by ensuring it only works for
   * many-to-many through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#clearObjects}
   */
  clearObjects: manyToManyOnly('Cannot clear objects'),

  /**
   * Handle association of object attributes for through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#associateObjectAttributes}
   */
  associateObjectAttributes: override(function(/*instance, obj*/) {
  }),

  /**
   * Handle disassociation of object attributes for through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#disassociateObjectAttributes}
   */
  disassociateObjectAttributes: override(function(/*instance, obj*/) {
  }),

  /**
   * Override of {@link HasMany#scopeObjectQuery}.
   *
   * @method
   * @protected
   * @see {@link HasMany#scopeObjectQuery}
   */
  scopeObjectQuery: override(function(instance, query) {
    var throughRelations = this._expand().reverse();
    var joinableRelations = _.initial(throughRelations);
    var joinName;
    var inverseKeyAttr;

    // the use of `_joinRelation` is safe on a bound query (and in fact
    // requires it to be bound), so we leave the query bound for now.
    joinableRelations.forEach(function(relation, index) {
      var inverseRelation = relation.inverseRelation();
      var nextRelation = throughRelations[index + 1];
      var throughName = relation._name + '_through';
      joinName = nextRelation._name + '_through';
      inverseKeyAttr = nextRelation.inverseKeyAttr;
      query = query._joinRelation(joinName, inverseRelation, {
        through: throughName,
      });
    });

    // we cannot use the bound query automatic transformations on the where
    // clause of the query since the source relation could be implicit. we
    // therefore use the proper database attribute value here on an unbound
    // query, then rebind it afterwards.
    var pk = instance.getAttribute(this.primaryKeyAttr);
    var joinTable = query._joinedRelations[joinName].as;
    var qualifiedKey = [joinTable, inverseKeyAttr].join('.');
    var where = _.object([[qualifiedKey, pk]]);
    query = query.unbind().where(where).rebind();

    return query;
  }),

  /**
   * Handle addition for through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#executeAdd}
   */
  executeAdd: override(function(instance, objects) {
    if (!objects.length) { return; }

    var throughRelations = this._expand().reverse();
    var sourceRelation = throughRelations[0];
    var throughRelation = throughRelations[1];
    var after = this.afterAddingObjects.bind(this, instance, objects);
    var query = sourceRelation._modelClass.objects.insert([]).unbind();
    objects.forEach(function(object) {
      var values = {};
      values[throughRelation.foreignKeyAttr] = instance.pk;
      values[sourceRelation.foreignKeyAttr] = object.pk;
      query = query.values(values);
    });

    return query.execute().tap(after);
  }),

  /**
   * Handle removal for through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#executeRemove}
   */
  executeRemove: override(function(instance, objects) {
    if (!objects.length) { return; }

    var throughRelations = this._expand().reverse();
    var sourceRelation = throughRelations[0];
    var throughRelation = throughRelations[1];
    var after = this.afterRemovingObjects.bind(this, instance, objects);
    var removable = _.filter(objects, 'persisted');
    var query = sourceRelation._modelClass.objects.unbind();
    var fks = _.map(removable, 'pk');
    var fkQueryKey = sourceRelation.foreignKeyAttr;

    if (fks.length === 0) { query = null; }
    else if (fks.length === 1) { fks = fks[0]; }
    else { fkQueryKey += '$in'; }

    var where = {};
    where[throughRelation.foreignKeyAttr] = instance.pk;
    where[fkQueryKey] = fks;

    return Promise.resolve(query && query.where(where).delete()).tap(after);
  }),

  /**
   * Handle clearing for through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#executeRemove}
   */
  executeClear: override(function(instance) {
    var throughRelations = this._expand().reverse();
    var sourceRelation = throughRelations[0];
    var sourceModel = sourceRelation._modelClass;
    var throughRelation = throughRelations[1];
    var where = _.object([[throughRelation.foreignKeyAttr, instance.pk]]);
    var query = sourceModel.objects.unbind().where(where).delete();
    var after = this.afterClearingObjects.bind(this, instance);
    return query.execute().tap(after);
  }),

  /**
   * Handle pre-fetch for through relations.
   *
   * Pre-fetching of through relations is handled by
   * {@link BoundWith#_prefetch} when through relations are expanded, so this
   * method simply throws an error.
   *
   * @method
   * @protected
   * @see {@link HasMany#associatePrefetchResults}
   */
  prefetch: override(function(/*instances*/) {
    throw new Error('Cannot pre-fetch directly on a through relation.');
  }),

  /**
   * Handle pre-fetch association for through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#associatePrefetchResults}
   */
  associatePrefetchResults: override(function(instances, grouped, accumulated) {
    var self = this;
    var throughRelations = this._expand();
    instances.forEach(function(instance) {
      var pks = _.map([instance], self.primaryKey);
      var objects;
      throughRelations.forEach(function(relation, index) {
        var group = accumulated[index];
        objects = pks.reduce(function(array, pk) {
          return _.union(array, group[pk]);
        }, []);

        var nextRelation = throughRelations[index + 1];
        if (nextRelation) {
          pks = _.map(objects, function(obj) {
            return obj.getAttribute(nextRelation.joinKeyAttr);
          });
        }
      });
      self.associateFetchedObjects(instance, objects);
    });
  }),

  /**
   * The model class through which a many-to-many relationship should built.
   *
   * This is simply a convenience method used to determine the join model
   * during the process of configuring the relationship & the adding of
   * implicit relation for many-to-may setups.
   *
   * @method
   * @private
   * @return {Class}
   */
  _joinModel: function() {
    var db = this._modelClass.db;
    var through = this._options.through;
    var parts = _.snakeCase(through).split('_');
    var name = parts.map(inflection.singularize, inflection).join('_');
    var table = parts.map(inflection.pluralize, inflection).join('_');
    return db.model(name).reopenClass({ tableName: table });
  },

  /**
   * Determine if this relation is a many-to-many relationship, that is if the
   * inverse relationship is a many relationship as well. Has many
   * relationships are not many-to-many by default.
   *
   * @method
   * @protected
   * @return {?Boolean} True if the relationship is many-to-many. False if it
   * is certainly not a many-to-many. Undefined if it could be with the
   * addition of a (belongsTo) source relation.
   */
  _isToMany: override(function() {
    var throughRelations =
      this._expansionDetails({ assumeIsToMany: true }).relations;
    var throughRelation = throughRelations[0];
    var sourceRelation = throughRelations[1];
    var result;

    if (!sourceRelation) {
      // there is no source relation, this could be a many-to-many relationship
      // if one was added (which will happen automatically in `configure`).
      result = undefined;
    }
    else if (!throughRelation &&
        (throughRelations.length === 2) &&
        (sourceRelation._relatedModel === this._relatedModel) &&
        (sourceRelation.joinKey === sourceRelation.foreignKey)) {
      // if there is no through relation, but the source relation matches, then
      // this could be a many-to-many relationship if the through was was added
      // (which will happen automatically in `configure`).
      result = undefined;
    }
    else {
      // this checks that we have a belongs-to style & a has-many style
      // relationship set up. the check is done via the _style_ of the
      // relationships by looking at the keys instead of looking at the actual
      // type of the relationship to make it possible for other relationship
      // types to exist & still have many-to-many through relationships work
      // with them.
      result = (throughRelations.length === 2) &&
        (sourceRelation._relatedModel === this._relatedModel) &&
        (sourceRelation.joinKey === sourceRelation.foreignKey) &&
        (throughRelation.inverseKey === throughRelation.foreignKey);
    }
    return result;
  }),

  /**
   * Get all relations from the source relation (inclusive) to this relation
   * (not inclusive).
   *
   * This method ensures that while accessing relationships it does not
   * prematurely configure them.
   *
   * @method
   * @private
   * @param {Object} [options]
   * @param {Boolean} [options.assumeIsToMany] Allow this relation to be a
   * through to a relation that does not yet exist, while assuming that it
   * would be defined as a `hasMany` relation to the join model (which it
   * obtains via `_joinModel`).
   * @return {{relations:Array.<BaseRelation>,error:Object}}
   */
  _expansionDetails: function(options) {
    var opts = options || {};
    var self = this;
    var details = {};
    var sourceName = this._options.source || this._name;
    var relations = details.relations = [];
    var relation = self;
    var assumeIsToMany = opts.assumeIsToMany;

    while (relation && relation._options.through) {
      var through = relation._options.through;
      var modelClass = relation._modelClass;
      var jumpToModel = null; // the model class the through 'jumps' to
      var throughRelation = through && modelClass['_' + through + 'Relation'];

      if (!throughRelation && assumeIsToMany && relation === this) {
        jumpToModel = this._joinModel();
      }
      else if (!throughRelation) {
        details.error = new Error(util.format(
          'Could not find through relation %j for %s#%s has-many relation',
          through, modelClass.__identity__.__name__, relation._name));
        relation = null;
      }
      else if (throughRelation._options.through) {
        // a through relation to another through relation is not really through
        // any relationship at all. it's more like an alias to another property
        // on this same model that itself could be through to something else.
        relation = throughRelation;
      }
      else {
        // we now assume that we need to jump to the related model. locating
        // the source on the related model may being the the source relation
        // that we're looking for,  but it could actually be a through relation
        // itself, just defined on the related model. it's only the true source
        // relation if it's not a through relation itself.
        jumpToModel = throughRelation._relatedModel;
      }

      if (jumpToModel) {
        // searching for the source relation in this model class that we're
        // jumping over to. we need to search both for the given name and the
        // singularized name.
        var jumpRelation =
          jumpToModel['_' + sourceName + 'Relation'] ||
          jumpToModel['_' + inflection.singularize(sourceName) + 'Relation'];

        if (!jumpRelation) {
          var modelName = modelClass.__identity__.__name__;
          var jumpModelName = jumpToModel.__identity__.__name__;
          details.error = new Error(util.format(
            'Could not find source relation %s#%s or %s#%s ' +
            'for %s#%s has-many relation',
            jumpModelName, sourceName,
            jumpModelName, inflection.singularize(sourceName),
            modelName, relation._name));
          relation = null;
        }

        relations.push(throughRelation);
        relation = jumpRelation;
      }
    }

    // the relation that's set at the end of looping, if it exists, is the
    // source relation. we know that it's not a through relation itself because
    // it failed the loop condition for `_options.through`. it must, therefore
    // be the source.
    if (relation) {
      relations.push(relation);
      relation = null;
    }

    return details;
  },

});
