'use strict';

var Class = require('./util/class');
var inflection = require('./util/inflection');

// TODO: consider how to set up the model class. we would like to get the
// schema from the db before doing anything with the model so that we can
// support getter/setter methods that are aware of the types they're working
// with and can report better errors. that may mean using a `setup` function
// like:
//
//     var Person = db.Model.extend();
//     Person.setup().then(function() {
//       Person.create().save();
//     });
//
// or on the database:
//
//     db.setup().then(function() {
//       Person.create().save();
//     });
//
// other thoughts:
//
//     db.loadModels('./path/to/dir')
//     db.prepareModels(Person, ...)
//     var Person = db.Model.extend().prepare().then('...')
//

// REVISIT: createOrUpdate()

// REVISIT: support difference between join queries (one-to-one) and prefetching (one-to-many)?
// REVISIT: support difference between join queries (for actual querying) and prefetching (associations for use)?

// REVISIT: perform a join query when there are conditions & build all objects
// from the result data (which will include duplicates). when there are no
// conditions, simply perform multiple queries to prefetch data to avoid
// duplicate data being sent back to JS.

/**
 * The base model class.
 *
 * ## Accessing Objects
 *
 *     Article.objects.all().then('...'); // -> select * from "articles";
 *     Article.objects.where({ pk: 1 }).fetch().then('...');
 *     // -> select * from "articles" where "articles"."id" = ?;
 *     // !> [1]
 *
 * ## Table Level Queries
 *
 *     var Article = Model.extend();
 *     Article.objects.delete(); // -> delete from "articles";
 *     Article.objects.update({ title: 'Article' });
 *     // -> update "articles" set "title" = ?;
 *     // !> ['Article']
 *
 * ## Options
 *
 *     var Article = Model.extend();
 *
 *     Article.reopenClass({
 *       tableName: 'articles',
 *       primaryKey: 'id'
 *     });
 *
 * ## Associations
 *
 *     var hasMany = Model.hasMany;
 *     var belongsTo = Model.belongsTo;
 *
 *     var Article = Model.extend({
 *       author: belongsTo('user', { key: 'author_id', foreignKey: 'id' })
 *     });
 *     module.exports = Article.reopenClass({ __name__: 'Article' });
 *
 *     var User = Model.extend({
 *       articles: hasMany(Article)
 *     });
 *     module.exports = User.reopenClass({ __name__: 'User' });
 *
 *     Article.objects.with('blog').fetch().then('...');
 *     // -> select * from "articles";
 *     // -> select * from "blogs" where "blog"."id" in (?, ?);
 *     // !> [3,5,8]
 *
 *     Article.objects.where({ 'blog.title[contains]': 'Azul' }).fetch().then('...');
 *     // -> select * from "articles" left join "blogs" on "articles"."blog_id" = "blog"."id"
 *     // -> where "blogs"."title" like ?;
 *     // !> ["%Whit%"];
 *
 *     Article.objects.where({ 'title[contains]': 'Azul' }).fetchOne().then('...');
 *     // throws if not exactly one record
 *
 *     var user = User.create();
 *     user.save().then('...'); // insert
 *
 *     user.save().then('...'); // no save because no changes
 *     user.name = 'Whitney';
 *     user.save().then('...'); // update
 *
 *     user.delete();
 *     user.save(); // delete
 *
 *     // note: user.destory(); // shortcut for user.delete().save()
 *
 * ### Accessing Relationships
 *
 *     User.find(1).then(function(user) {
 *       user.articles; // throws because this was not `with` articles
 *     });
 *
 *     User.find(1).with('articles').fetch().then(function(user) {
 *       user.articles; // okay
 *     });
 *
 *     User.find(1)
 *     .then(function(user) { return user.fetch('articles'); })
 *     .then(function(user) {
 *       return bog.articles; // okay because of prior fetch
 *     });
 *
 *     Article.find(1).then(function(article) {
 *       article.author; // throws because this was not `with` the author
 *     });
 *
 *     Article.find(1).with('author').then(function(article) {
 *       article.author; // okay
 *     });
 *
 * ### Querying
 *
 *     Article.objects.where({ 'author.name[contains]': 'Whit' }).fetch().then('...');
 *     // -> select * from "articles"
 *     // -> left join "users" on "articles"."author_id" = "users"."id"
 *     // -> where "users"."name" like ?;
 *     // !> ["%Whit%"]
 *
 *     Article.objects.where({ 'author.name[contains]': 'Whit' })
 *       .orderBy('name', 'desc')
 *       .limit(10)
 *       .offset(20)
 *       .fetch()
 *       .then('...');
 *     // -> select * from "articles"
 *     // -> left join users on "articles"."author_id" = "users"."id"
 *     // -> where "users"."name" like ?
 *     // -> order by "users"."name" desc
 *     // -> limit 10 offset 20;
 *     // !> ["%Whit%"]
 *
 *     Article.objects.with('author', 'comments').fetch().then('...');
 *     // -> select * from "articles";
 *     // -> select * from "users" where "users"."id" in (?, ?);
 *     // !> [10,32]
 *     // -> select * from "comments" where "comments"."id" in (?, ?, ?);
 *     // !> [12,43,73]
 *
 *
 * ### Manipulating Relationships
 *
 *
 *     var article = Article.create({ title: 'Example' });
 *     user.addArticle(article).then('...');
 *     // -> insert into "articles" ("title", "author_id") values ?, ?;
 *     // !> ["Example", 1]
 *
 *     user.createArticle({ title: 'Example' }).then(function(article) {
 *       // ...
 *     });
 *     // -> insert into "articles" ("title", "author_id") values ?, ?;
 *     // !> ["Example", 1]
 *
 *     user.addArticles(article1, article2).then(function(articles) {
 *       // ...
 *     });
 *     // -> insert into "articles" ("title", "author_id") values (?, ?), (?, ?);
 *     // !> ["Example1", 1, "Example2", 1]
 *
 *     user.removeArticles(article1, article2).then('...');
 *     // -> update "articles" set "author_id" = null
 *     // -> where "articles"."id" in (?, ?);
 *     // !> [1, 2]
 *
 *     user.removeArticle(article1).then('...');
 *     // -> update "articles" set "author_id" = null
 *     // -> where "articles"."id" = ?;
 *     // !> [1]
 *
 *     user.clearArticles().then('...');
 *     // -> update "articles" set "author_id" = null
 *     // -> where "articles"."author_id" = ?;
 *     // !> [1]
 *
 *
 * ## Managers
 *
 *     var FemaleManager = Manager.extend({
 *       query: function() {
 *         return this._super().where({ sex: 'female' });
 *       }
 *     });
 *
 *     var MaleManager = Manager.extend({
 *       query: function() {
 *         return this._super().where({ sex: 'male' });
 *       }
 *     });
 *
 *     var Person = Model.extend({}, {
 *       women: FemaleManager,
 *       men: MaleManager,
 *       objects: Manager // could customize...
 *     });
 *
 */
var Model = Class.extend();

Model.reopenClass({

  /**
   * Documentation forthcoming.
   *
   * For example:
   *
   *     var User = Model.extend({
   *       articles: hasMany('articles')
   *     });
   *
   */
  hasMany: function() {

  },

  /**
   * Documentation forthcoming.
   *
   * For example:
   *
   *     var Article = Model.extend({
   *       author: belongsTo('user', { key: 'user_id', foreignKey: 'id' })
   *     });
   */
  belongsTo: function() {

  },

  /**
   * Documentation forthcoming.
   */
  tableName: function() {
    return inflection.pluralize(this.__name__.toLowerCase());
  }

  // TODO: create relation class
  // `user.articles` === property that throws or has data in it
  // `user.articlesRelation` is an object (perhaps a query) with extra methods for manipulating/accessing data
  // `user.addArticle` === `user.articlesRelation.add`
  // `user.addArticles` === `user.articlesRelation.add`
  // `user.clearArticles` === `user.articlesRelation.clear`
  // `user.removeArticle` === `user.articlesRelation.remove`
  // `user.removeArticles` === `user.articlesRelation.remove`
  // `user.createArticle` (or just do this through addArticle?) === `user.articlesRelation.create`
});

Model.defineClassAccessor('objects', function() {
  if (this._objects) { return this._objects; }

  var tableName = this.tableName();
  var create = this.create.bind(this);
  var objects = this.query.bind(tableName).transform(function(result) {
    return result.rows.map(create);
  });
  this._objects = objects;

  return this._objects;
});

module.exports = Model.reopenClass({ __name__: 'Model' });
