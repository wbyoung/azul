'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var Actionable = require('../util/actionable');
var BluebirdPromise = require('bluebird');

/**
 * HasMany mixin for associations.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Specific method for associating objects that have just been fetched
   * from the database.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects to add to the association.
   * @see {@link HasMany~AssociationsMixin}
   */
  associateFetchedObjects: function(instance, objects) {
    this.associateObjects(instance, objects, { attrs: false });
  },

  /**
   * Associate multiple objects. For performance reasons, this is preferred
   * over simply associating each object individually.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects to add to the association.
   * @param {Object} [options] Options. See {@link BaseRelation#associate}.
   */
  associateObjects: function(instance, objects, options) {
    // TODO: revisit for refactoring
    if (this._options.through) {
      return this.associateObjectsThrough(instance, objects, options);
    }

    var opts = _.defaults({}, options, { follow: true, attrs: true });

    objects.forEach(function(relatedObject) {
      if (opts.attrs) {
        // always set foreign key in case the inverse relation does not exist
        relatedObject.setAttribute(this.foreignKey, instance.id);
      }

      var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];
      if (inverse) {
        inverse.associate(relatedObject, instance, _.extend({}, options, {
          follow: false
        }));
      }
    }, this);
  },

  // TODO: docs
  associateObjectsThrough: function(instance, objects, options) {
    var opts = _.defaults({}, options, { follow: true, attrs: true });
    var throughRelations = this._throughRelations();
    var sourceRelation = throughRelations.length === 2 ?
      throughRelations[0] : undefined;

    if (!sourceRelation && opts.attrs) {
      throw new Error('Cannot associate this type of through relation.');
    }
    // TODO: refactor & better handle associating fetched has-many-through
    // shortcut style relations
    if (!sourceRelation) {
      return;
    }

    var actions = objects.map(function(object) {
      var joinModel = sourceRelation._modelClass.create();
      sourceRelation.associate(joinModel, instance, options);
      sourceRelation.associate(joinModel, object, options);
      return Actionable.create(joinModel.save.bind(joinModel));
    });

    this.beforeSavingActions(instance, actions);
  },

  // TODO: docs & move & rename
  _perofrmSave: function(instance, objects) {
    var after = this.afterSavingActions.bind(this, instance, objects);
    return BluebirdPromise.map(objects, function(obj) {
      return obj;
    })
    .tap(after);
  },

  // TODO: docs & move & rename
  beforeSavingActions: function(instance, actions) {
    var data = this._getInFlightData(instance);
    data.save = _.union(data.save, actions);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
  },

  // TODO: docs & move & rename
  afterSavingActions: function(instance, actions) {
    var data = this._getInFlightData(instance);
    data.save = _.difference(data.save, actions);
    this._setInFlightData(instance, data);
    this._super.apply(this, arguments);
  },

  /**
   * Override of {@link BaseRelation#associate}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#associate}
   */
  associate: function(instance, relatedObject, options) {
    this.associateObjects(instance, [relatedObject], options);
  },

  /**
   * Disassociate multiple objects. For performance reasons, this is preferred
   * over simply disassociating each object individually.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects to remove from the association.
   * @param {Object} [options] Options. See {@link BaseRelation#disassociate}.
   */
  disassociateObjects: function(instance, objects, options) {
    // TODO: revisit for refactoring
    if (this._options.through) {
      return this.disassociateObjectsThrough(instance, objects, options);
    }

    var opts = _.defaults({}, options, { follow: true, attrs: true });

    objects.forEach(function(relatedObject) {
      if (opts.attrs) {
        // always set foreign key in case the inverse relation does not exist
        relatedObject.setAttribute(this.foreignKey, undefined);
      }

      var inverse = opts.follow && relatedObject[this.inverse + 'Relation'];
      if (inverse) {
        inverse.disassociate(relatedObject, instance, _.extend({}, options, {
          follow: false
        }));
      }
    }, this);
  },

  // TODO: docs
  disassociateObjectsThrough: function(instance, objects, options) {
    var opts = _.defaults({}, options, { follow: true, attrs: true });
    var throughRelations = this._throughRelations();
    var sourceRelation = throughRelations[0];
    var throughRelation = throughRelations[1];
    var manyToMany = (throughRelations.length === 2);

    if (!manyToMany && opts.attrs) {
      throw new Error('Cannot disassociate this type of through relation.');
    }
    // TODO: refactor & better handle associating fetched has-many-through
    // shortcut style relations
    if (!manyToMany) {
      return;
    }

    var actions = objects.map(function(object) {
      // TODO: need to figure out how to access the actual join model object
      // that could exist in memory within the through association cache (also
      // think through other places that it could be).
      // var joinModel = sourceRelation._modelClass.create();
      // sourceRelation.disassociate(joinModel, instance, options);
      // sourceRelation.disassociate(joinModel, object, options);

      // TODO: are all of the keys being accessed properly here?
      var where = {};
      where[throughRelation.foreignKey] = instance.pk;
      where[sourceRelation.foreignKey] = object.pk;
      var query = sourceRelation._modelClass.objects.delete().where(where);

      return query;
    });

    this.beforeSavingActions(instance, actions);
  },

  /**
   * Override of {@link BaseRelation#disassociate}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#disassociate}
   */
  disassociate: function(instance, relatedObject, options) {
    this.disassociateObjects(instance, [relatedObject], options);
  }

});
