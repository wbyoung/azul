'use strict';

var _ = require('lodash');
var util = require('util');
var inflection = require('../util/inflection');
var BluebirdPromise = require('bluebird');
var Mixin = require('../util/mixin');

// TODO: docs
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

// TODO: docs
var manyToManyOnly = function(message) {
  return override(function() {
    if (!this.inverseIsMany()) {
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
   * @param {String} [options.autoJoin] When using `through` and this option is
   * enabled (the default), a has-many relation will be created automatically
   * assuming this is many-to-many relationship using a join table. Currently
   * this option is only available internally.
   * @see {@link BaseRelation#init}
   */
  init: function(name, attributeDetails) {
    this._super.apply(this, arguments);
    this._options = _.defaults({}, this._options, {
      autoJoin: true
    });

    // when specifying a _through_ relation, it will normally be a _through_
    // relation to a join table to set up a many to many relationship. defining
    // two `hasMany` relations every time you want to set up a many to many
    // relationship would be tedious. we therefore assume that if `through` is
    // specified, but there is no relation on the current model that matches,
    // that it's the common case of a many to many relationship, so this
    // `through` is to set up the join table. this code adds a has many
    // relation to the model automatically.
    var through = this._options.through;
    var autoJoin = this._options.autoJoin;
    var modelClass = this._modelClass;
    var prototype = modelClass.__class__.prototype;
    var properties = attributeDetails.properties;
    var throughRelation = through && prototype[through + 'Relation'];
    if (through && autoJoin && !throughRelation && !properties[through]) {
      var hasMany = this.__identity__.attr();
      var attrs = _.object([[through, hasMany()]]);
      modelClass.reopen(attrs);
    }
  },

  /**
   * Get all relations from the source relation (inclusive) to this relation
   * (not inclusive).
   *
   * @method
   * @private
   * @return {Array.<BaseRelation>}
   */
  _throughRelations: function() {
    var sourceName = this._options.source || this._name;
    var relations = [];
    var relation = this;
    while (relation) {
      var through = relation._options.through;
      var modelClass = relation._modelClass;
      var prototype = modelClass.__class__.prototype;
      var throughRelation = through && prototype[through + 'Relation'];
      if (through === undefined) {
        // this is the end of the chain of through relations. it's the actual
        // source relation that we've been searching for.
        relations.unshift(relation);
        relation = null;
      }
      else if (!throughRelation) {
        throw new Error(util.format(
          'Could not find through relation %j for %s#%s has-many relation',
          through, modelClass.__identity__.__name__, relation._name));
      }
      else if (throughRelation._options.through) {
        // a through relation to another through relation is not really through
        // any relationship at all. it's more like an alias to another property
        // on this same model that itself could be through to something else.
        relation = throughRelation;
      }
      else {
        // we're jumping over to a new model now, so we look at the related
        // model class on the through relation. we'll refer to it as the source
        // here, but it may not be the final source that we're searching for.
        // it could actually be a through relation itself, just defined on the
        // related model
        var sourceModel = throughRelation._relatedModel;
        var sourcePrototype = sourceModel.__class__.prototype;
        var sourceRelation =
          sourcePrototype[sourceName + 'Relation'] ||
          sourcePrototype[inflection.singularize(sourceName) + 'Relation'];

        if (!sourceRelation) {
          var modelName = modelClass.__identity__.__name__;
          var sourceModelName = sourceModel.__identity__.__name__;
          throw new Error(util.format(
            'Could not find source relation %s#%s or %s#%s ' +
            'for %s#%s has-many relation',
            sourceModelName, sourceName,
            sourceModelName, inflection.singularize(sourceName),
            modelName, relation._name));
        }

        relations.unshift(throughRelation);
        relation = sourceRelation;
      }
    }

    return relations;
  },

  /**
   * Determine if this is a many to many relationship.
   *
   * @method
   * @protected
   * @see {@link HasMany#inverseIsMany}
   */
  inverseIsMany: override(function() {
    var throughRelations = this._throughRelations();
    var sourceRelation = throughRelations[0];
    var throughRelation = throughRelations[1];

    // this checks that we have a belongs-to style & a has-many style
    // relationship set up. the check is done via the _style_ of the
    // relationships by looking at the keys instead of looking at the actual
    // type of the relationship to make it possible for other relationship
    // types to exist & still have many-to-many through relationships work with
    // them.
    return (throughRelations.length === 2) &&
      (sourceRelation.joinKey === sourceRelation.foreignKey) &&
      (throughRelation.inverseKey === throughRelation.foreignKey);
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
    return this.inverseIsMany() ? this._super() : null;
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
    return this._throughRelations().reverse();
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
    var foreignKey;
    var throughRelations = this._throughRelations();
    var joinableRelations = _.rest(throughRelations);

    joinableRelations.forEach(function(relation, index) {
      var previousRelation = throughRelations[index];
      var previousJoinName = previousRelation._name + '_through';
      var joinName = relation._name + '_through';
      foreignKey = [joinName, relation.foreignKey].join('.');
      query = query._joinRelation(joinName, previousRelation, {
        through: previousJoinName,
        reverse: true,
      });
    });

    var where = _.object([[
      foreignKey, instance.getAttribute(this.primaryKey)
    ]]);
    return query.where(where);
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

    var throughRelations = this._throughRelations();
    var sourceRelation = throughRelations[0];
    var throughRelation = throughRelations[1];
    var after = this.afterAddingObjects.bind(this, instance, objects);

    return BluebirdPromise.map(objects, function(object) {
      return object.save();
    })
    .then(function() {
      var query = sourceRelation._modelClass.objects.insert();
      objects.forEach(function(object) {
        var values = {};
        values[throughRelation.foreignKey] = instance.pk;
        values[sourceRelation.foreignKey] = object.pk;
        query = query.values(values);
      });
      return query;
    })
    .tap(after);
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

    var throughRelations = this._throughRelations();
    var sourceRelation = throughRelations[0];
    var throughRelation = throughRelations[1];
    var after = this.afterRemovingObjects.bind(this, instance, objects);
    var removable = _.filter(objects, 'persisted');

    return BluebirdPromise.map(removable, function(object) {
      var save = !object.newRecord;
      return save && object.save();
    })
    .then(function() {
      var query = sourceRelation._modelClass.objects.delete();
      var fks = _.map(removable, 'pk');
      var fkQueryKey = sourceRelation.foreignKey;

      if (fks.length === 0) { query = null; }
      else if (fks.length === 1) { fks = fks[0]; }
      else { fkQueryKey += '[in]'; }

      var where = {};
      where[throughRelation.foreignKey] = instance.pk;
      where[fkQueryKey] = fks;


      return query && query.where(where);
    })
    .tap(after);

  }),

  /**
   * Handle clearing for through relations.
   *
   * @method
   * @protected
   * @see {@link HasMany#executeRemove}
   */
  executeClear: override(function(instance) {
    var throughRelations = this._throughRelations();
    var sourceRelation = throughRelations[0];
    var throughRelation = throughRelations[1];
    var where = _.object([[throughRelation.foreignKey, instance.pk]]);
    var query = sourceRelation._modelClass.objects.where(where).delete();
    var after = this.afterClearingObjects.bind(this, instance);
    return query.execute().tap(after);
  }),

  /**
   * Handle pre-fetch for through relations.
   *
   * Pre-fetching of through relations is handled by
   * {@link ModelQuery#_prefetch} when through relations are expanded, so this
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
  }),

});
