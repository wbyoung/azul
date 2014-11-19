'use strict';

var AttributeTrigger = require('../../util/attribute_trigger');

/**
 * The belongs to property for models.
 *
 * Documentation forthcoming.
 *
 * For example:
 *
 *     var Article = Model.extend({
 *       author: belongsTo('user', { key: 'user_id', foreignKey: 'id' })
 *     });
 *
 * @since 1.0
 * @public
 * @constructor BelongsTo
 * @extends AttributeTrigger
 */
var BelongsTo = AttributeTrigger.extend({
  invoke: function(name, reopen/*, prototype*/) {
    var methods = {};
    methods[name] = function() {};
    reopen(methods);
  }
});

module.exports = BelongsTo.reopenClass({ __name__: 'BelongsTo' });
