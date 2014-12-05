'use strict';

var _ = require('lodash');
var AttributeTrigger = require('../util/attribute_trigger');

/**
 * An attribute trigger that uses subclasses of {@link BaseRelation} to define
 * a set of properties & methods dynamically. Everything that's returned from
 * the subclass's {@link BaseRelation#methods} will be added to the object on
 * which the trigger was defined.
 *
 * During invocation, this trigger creates the {@link BaseRelation} subclass
 * based on the type & arguments that were given to the initializer. The
 * relation object that's created will be constructed with the following
 * arguments: the name of the attribute being defined, the class object on
 * which it's being defined, and any `args` given to the trigger will be
 * concatenated to these arguments.
 *
 * While you could use this class directly, the convenience method
 * {@link BaseRelation.attribute}, allows creation by subclasses with a simpler
 * method call.
 *
 * @since 1.0
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
    this._args = _.collect(args);
  },

  /**
   * Override of {@link AttributeTrigger#invoke}.
   *
   * @since 1.0
   * @public
   * @method
   * @see {@link AttributeTrigger#invoke}
   */
  invoke: function(name, reopen, details) {
    var type = this._type;
    var modelClass = details.context.__identity__;
    var args = [name, modelClass].concat(this._args);
    var relation = type.create.apply(type, args);
    var methods = relation.methods();
    reopen(methods);
  }

});

module.exports = RelationAttr.reopenClass({ __name__: 'RelationAttr' });
