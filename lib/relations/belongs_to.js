'use strict';

var Property = require('../util/property').Class;

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
 * @extends Property
 */
var BelongsTo = Property.extend({
  init: function(type) {
    this._super(this._getter());
  },

  /**
   * Return a getter function for this property.
   *
   * The getter function for a relationship is responsible for setting up a
   * relationship object. The getter method will always be attached as an
   * instance method of a {@link Model}.
   *
   * @return {Function} The getter function.
   */
  _getter: function() {
    return function() {
      var model = this;
      return null;
    };
  }

});

module.exports = BelongsTo.reopenClass({ __name__: 'BelongsTo' });
