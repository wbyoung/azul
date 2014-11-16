'use strict';

var Property = require('../util/property').Class;

// TODO: create relation class
// `user.articles` === property that throws or has data in it
// `user.articlesRelation` is an object (perhaps a query) with extra methods for manipulating/accessing data
// `user.addArticle` === `user.articlesRelation.add`
// `user.addArticles` === `user.articlesRelation.add`
// `user.clearArticles` === `user.articlesRelation.clear`
// `user.removeArticle` === `user.articlesRelation.remove`
// `user.removeArticles` === `user.articlesRelation.remove`
// `user.createArticle` (or just do this through addArticle?) === `user.articlesRelation.create`

/**
 * The has many property for models.
 *
 * Documentation forthcoming.
 *
 * For example:
 *
 *     var User = Model.extend({
 *       articles: hasMany('articles')
 *     });
 *
 * @since 1.0
 * @public
 * @constructor HasMany
 * @extends Property
 */
var HasMany = Property.extend({
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

module.exports = HasMany.reopenClass({ __name__: 'HasMany' });
