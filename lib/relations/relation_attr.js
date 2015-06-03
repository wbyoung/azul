'use strict';

var _ = require('lodash');
var AttributeTrigger = require('corazon').AttributeTrigger;

/**
 * An attribute trigger that uses subclasses of {@link BaseRelation} to define
 * a set of properties & methods dynamically. Everything that's returned from
 * the subclass's {@link BaseRelation#methods} will be added to the object on
 * which the trigger was defined.
 *
 * While you could use this class directly, the convenience method
 * {@link BaseRelation.attribute}, allows creation by subclasses with a simpler
 * method call.
 *
 * @protected
 * @constructor RelationAttr
 * @extends AttributeTrigger
 * @param {Class} type The type of relation
 * @param {Arguments} arguments Arguments to be pass through to the creation of
 * the relation type (these will be concatenated on the end of the standard
 * arguments passed to the relation constructor).
 */
var RelationAttr = AttributeTrigger.extend(/** @lends RelationAttr# */ {
  init: function(type, args) {
    this._type = type;
    this._args = _.toArray(args);
  },

  /**
   * Build a new relation object for determining methods to add.
   *
   * The {@link BaseRelation} subclass is created based on the type & arguments
   * that were given to the initializer. The object that's created will be
   * constructed with the following arguments: the name of the attribute being
   * defined, and the class object on which it's being defined. Any `args`
   * given to the trigger's constructor will be concatenated on to these
   * arguments.
   *
   * @method
   * @private
   * @param {String} name The name of the attribute being defined.
   * @param {Object} details The details of the attribute, given unaltered
   * from {@link AttributeTrigger#invoke}.
   * @see {@link AttributeTrigger#invoke}
   */
  _relation: function(name, details) {
    var type = this._type;
    var args = [name, details].concat(this._args);
    return type.create.apply(type, args);
  },

  /**
   * Get existing attribute and property names from the attribute setup details
   * provided to {@link RelationAttr#invoke}. This will pull from both those
   * that have already been defined on the class & those that are being defined
   * with this attribute.
   *
   * @param {Object} details The details of the attribute, given unaltered
   * from {@link AttributeTrigger#invoke}.
   * @return {Object} The collection of names with values set to a truthful
   * value.
   */
  _existing: function(details) {
    var existing = {};
    /** local */
    var assign = function(name) { existing[name] = true; };
    _.keys(details.prototype).forEach(assign); // already defined
    _.keys(details.properties).forEach(assign); // being defined with this attr
    return existing;
  },

  /**
   * Override of {@link AttributeTrigger#invoke}.
   *
   * @method
   * @public
   * @see {@link AttributeTrigger#invoke}
   */
  invoke: function(name, reopen, details) {
    var existing = this._existing(details);
    var methods = this._relation(name, details).methods(existing);
    reopen(methods);
  },

});

module.exports = RelationAttr.reopenClass({ __name__: 'RelationAttr' });
