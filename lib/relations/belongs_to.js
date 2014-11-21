'use strict';

var BaseRelation = require('./base');

/**
 * The belongs to property for models.
 *
 * Documentation forthcoming.
 *
 * For example:
 *
 *     var Article = Model.extend({
 *       author: belongsTo('user', { foreignKey: 'user_id', primaryKey: 'id' })
 *     });
 *
 * @since 1.0
 * @public
 * @constructor BelongsTo
 * @extends BaseRelation
 */
var BelongsTo = BaseRelation.extend(/** @lends BelongsTo# */ {
});

module.exports = BelongsTo.reopenClass({ __name__: 'BelongsTo' });
