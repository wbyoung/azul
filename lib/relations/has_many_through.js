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
    if (!this._isToMany) {
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
    var isToMany = this._calculateIsToMany();

    // this can be made into a many-to-many relationship if
    // `_calculateIsToMany` returns undefined (rather than true/false). if it
    // can be, now's the time to add the implicit `belongsTo` relationship.
    var canBeToMany = (isToMany === undefined);
    if (canBeToMany && !implicit) {
      var db = this._modelClass.db;
      var source = inflection.singularize(this._options.source || this._name);
      var joinModel = this._joinModel();
      var belongsToModel = this._relatedModel;
      var belongsToAttr = db.belongsTo(belongsToModel, { implicit: true });
      var belongsToAttrs = _.object([[source, belongsToAttr]]);
      joinModel.reopen(belongsToAttrs);
      isToMany = true;
    }

    this._isToMany = isToMany;
    this._super();

    // pre-configure all relations in the set of expanded relations
    _.invoke(this.expand(), 'configured');
  }),

  /**
   * Override of {@link HasMany#_inverse} that determines default inverse for
   * many-to-many through relationships.
   *
   * @method
   * @protected
   * @see {@link HasMany#_inverse}
   */
  _inverse: override(function() {
    var inverse;
    if (this._isToMany) {
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
   * Override of {@link BaseRelation#_joinTable}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#_joinTable}
   */
  _joinTable: override(function() {
    return this._isToMany ?
      this._joinModel().tableName :
      this._options.through;
  }),

  /**
   * Override of {@link HasMany#_foreignKey} that ensures that
   * many-to-many through relationships have a foreign key attribute that
   * matches the relationship they are through.
   *
   * @method
   * @protected
   * @see {@link HasMany#_foreignKey}
   */
  _foreignKey: override(function() {
    var foreignKey;
    var throughRelation = this._modelClass[this._options.through + 'Relation'];
    if (throughRelation) {
      foreignKey = throughRelation.foreignKey;
    }
    else {
      foreignKey = inflection.singularize(this._modelClass.__name__) + '_id';
      foreignKey = _.camelCase(foreignKey);
    }
    return foreignKey;
  }),

  /**
   * Override of {@link BaseRelation#_expansionName}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#_expansionName}
   */
  _expansionName: override(function() {
    return _.snakeCase(this._super() + '_through_' + this._options.through);
  }),

  /**
   * Get all relations from the this relation (not inclusive) to the source
   * relation (inclusive).
   *
   * @method
   * @private
   * @return {Array.<BaseRelation>}
   */
  _expand: override(function() {
    var details = this._expansionDetails();
    if (details.error) {
      throw details.error;
    }
    return details.relations;
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
  expand: override(function() {
    return this._expand();
  }),

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
      var nextRelation = throughRelations[index + 1];
      var throughName = relation._name + '_through';
      joinName = nextRelation._name + '_through';
      inverseKeyAttr = nextRelation.inverseKeyAttr;
      query = query._joinRelation(joinName, relation, {
        through: throughName,
        reverse: true,
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
  _joinModel: override(function() {
    var db = this._modelClass.db;
    var through = this._options.through;
    var parts = _.snakeCase(through).split('_');
    var name = parts.map(inflection.singularize, inflection).join('_');
    var table = parts.map(inflection.pluralize, inflection).join('_');
    return db.model(name).reopenClass({ tableName: table });
  }),

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
  _calculateIsToMany: override(function() {
    var throughRelations = this._expansionDetails().relations;
    var throughRelation = throughRelations[0];
    var sourceRelation = throughRelations[1];
    var result;
    if (!sourceRelation) {
      // there is no source relation, this could be a many-to-many relationship
      // if one was added (which will happen automatically in `configure`).
      result = undefined;
    }
    else {
      // this checks that we have a belongs-to style & a has-many style
      // relationship set up. the check is done via the _style_ of the
      // relationships by looking at the keys instead of looking at the actual
      // type of the relationship to make it possible for other relationship
      // types to exist & still have many-to-many through relationships work
      // with them.
      var acceptableLength = (throughRelations.length === 2);
      var hasJoin = (throughRelation === this) || (acceptableLength &&
        (throughRelation.inverseKey === throughRelation.foreignKey));
      var hasSource = (acceptableLength &&
        (sourceRelation._relatedModel === this._relatedModel) &&
        (sourceRelation.joinKey === sourceRelation.foreignKey));
      result = hasSource && hasJoin;
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
   * @return {{relations:Array.<BaseRelation>,error:Object}}
   */
  _expansionDetails: override(function() {
    var self = this;
    var details = {};
    var relations = details.relations = [];
    var relation = self;
    var targetModel = this._relatedModel;
    var source;

    /** local */
    var whileRelation = function(fn) { while (relation) { fn(); } };
    whileRelation(function() {
      var db = relation._modelClass.db;
      var through = relation._options.through;
      var modelClass = relation._modelClass;
      var relatedModel = relation._relatedModel;
      var throughRelation = through && modelClass['_' + through + 'Relation'];
      var jumpToModel;

      // we collect all relations that are not through to another one.
      if (!throughRelation) { relations.push(relation); }

      // set source when we hit the first through relation in model class. this
      // is cleared each time we hop, so when not set, we'll be in a new model
      // class.
      if (!source && through) {
        source = relation._options.source || relation._name;
      }

      // termination condition: we found our the related model we're looking
      // for and it's not on a through relation.
      if (!through && relatedModel === targetModel) { relation = null; }
      else if (throughRelation) { relation = throughRelation; }
      else if (through && self._isToMany && relation === self) {
        jumpToModel = self._joinModel();
      }
      else if (through) {
        // this is the last through relation in this model, so this now jumps
        // to a new model class.
        jumpToModel = db.model(inflection.singularize(through));
      }
      else {
        // the next model to look at is just this relation's related model.
        // this relation is likely as `hasMany` to the next relation, but could
        // be a `belongsTo` as well.
        jumpToModel = relation._relatedModel;
      }

      // we're jumping to a new model class now, so we need to perform a search
      // for the source within that new model class.
      if (jumpToModel) {

        var search = _.uniq([
          source,
          inflection.pluralize(source),
          inflection.singularize(source),
        ]);

        var jumpRelation = _(search)
          .map(function(name) { return '_' + name + 'Relation'; })
          .map(_.propertyOf(jumpToModel))
          .find();

        // source name changes when we jump to a new model
        source = undefined;

        if (jumpRelation) { relation = jumpRelation; }
        else {
          var modelName = modelClass.__name__;
          var jumpModelName = jumpToModel.__name__;
          var names = search.map(function(name) {
            return util.format('%s#%s', jumpModelName, name);
          });
          names.push('or ' + names.pop());
          details.error = new Error(util.format(
            'Could not find relation %s via %s#%s for ' +
            'through relation %s#%s', names.join(', '),
            modelName, relation._name, self._modelClass.__name__, self._name));
          relation = null;
        }
      }
    });

    return details;
  }),

});
