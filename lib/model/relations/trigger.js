'use strict';

var _ = require('lodash');
var AttributeTrigger = require('../../util/attribute_trigger');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @protected
 * @constructor RelationTrigger
 * @extends AttributeTrigger
 */
var RelationTrigger = AttributeTrigger.extend(/** @lends RelationTrigger# */ {
  init: function(type) {
    this._type = type;
    this._args = _.rest(arguments);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  invoke: function(name, reopen/*, prototype*/) {
    var type = this._type;
    var args = [name].concat(this._args);
    var relation = type.create.apply(type, args);
    var methods = relation.methods();
    reopen(methods);
  }

});

module.exports = RelationTrigger.reopenClass({ __name__: 'RelationTrigger' });
