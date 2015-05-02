'use strict';

var _ = require('lodash');
var util = require('util');
var BluebirdPromise = require('bluebird');
var Class = require('../util/class');
var Actionable = require('../util/actionable');
var Manager = require('./manager');
var HasMany = require('../relations/has_many');
var BelongsTo = require('../relations/belongs_to');
var property = require('../util/property').fn;
var attr = require('./attr').fn;
var inflection = require('../util/inflection');

// TODO: consider how to set up the model class. we would like to get the
// schema from the db before doing anything with the model so that we can
// support getter/setter methods that are aware of the types they're working
// with and can report better errors. that may mean using a `setup` function
// like:
//
//     var Person = db.model('person');
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
//     var Person = db.model('person').prepare().then('...')
//
// another idea:
//
// simply force the user to define all attributes on a model. an advantage to
// this is self-documenting code. a disadvantage is having to write more code.
// the writing more code could be solved by adding tools to the CLI that would
// allow inspection of a database to create/update models (similar to what the
// rails annotate tool does).

/**
 * The base model class.
 *
 * ## Accessing Objects
 *
 *     var attr = db.attr;
 *     var Article = db.model('article', {
 *       title: attr(),
 *     });
 *
 *     var User = db.model('user', {
 *       username: attr()
 *     });
 *
 *     Article.objects.all().then('...'); // -> select * from "articles";
 *     Article.objects.where({ pk: 1 }).fetch().then('...');
 *     // -> select * from "articles" where "id" = ?;
 *     // !> [1]
 *
 *     Article.objects.where({ 'title[contains]': 'Azul' }).fetchOne().then('...');
 *     // promise is rejected if not exactly one record
 *
 *     var user = User.create();
 *     user.save().then('...'); // insert
 *
 *     user.save().then('...'); // no save because no changes
 *     user.username = 'wbyoung';
 *     user.save().then('...'); // update
 *
 *     user.delete();
 *     user.save(); // delete
 *
 * ## Table Level Queries
 *
 *     var Article = db.model('article');
 *     Article.objects.delete(); // -> delete from "articles";
 *     Article.objects.update({ title: 'Article' });
 *     // -> update "articles" set "title" = ?;
 *     // !> ['Article']
 *
 * ## Options
 *
 *     var Article = db.model('article');
 *
 *     Article.reopenClass({
 *       tableName: 'articles',
 *     });
 *
 * ## Associations
 *
 *     var attr = db.attr;
 *     var hasMany = db.hasMany;
 *     var belongsTo = db.belongsTo;
 *
 *     var Blog = db.model('blog', {
 *       title: attr()
 *     });
 *
 *     var Article = db.model('article', {
 *       title: attr(),
 *       blog: belongsTo(),
 *       author: belongsTo('user')
 *     });
 *
 *     var User = db.model('user', {
 *       name: attr(),
 *       username: attr(),
 *       articles: hasMany('article', { inverse: 'author' })
 *     });
 *
 *     Article.objects.with('author').fetch().then('...');
 *     // -> select * from "articles";
 *     // -> select * from "users" where "id" in (?, ?, ?)
 *     // -> limit 3;
 *     // !> [3,5,8]
 *
 *     Article.objects.where({ 'blog.title[contains]': 'Azul' }).fetch().then('...');
 *     // -> select "articles".* from "articles"
 *     // -> inner join "blogs" on "articles"."blog_id" = "blogs"."id"
 *     // -> where "blogs"."title" like ?;
 *     // !> ["%Azul%"];
 *
 * ### Accessing Relationships
 *
 *     User.objects.find(1).then(function(user) {
 *       user.articles; // throws because this was not `with` articles
 *     });
 *
 *     User.objects.with('articles').find(1).fetch().then(function(user) {
 *       user.articles; // okay
 *     });
 *
 *     User.objects.find(1)
 *     .then(function(user) { return user.articleObjects.fetch(); })
 *     .then(function(user) {
 *       return user.articles; // okay because of prior fetch
 *     });
 *
 *     Article.objects.find(1).then(function(article) {
 *       article.author; // throws because this was not `with` the author
 *     });
 *
 *     Article.objects.with('author').find(1).then(function(article) {
 *       article.author; // okay
 *     });
 *
 * ### Querying
 *
 *     Article.objects.where({ 'author.name[contains]': 'Whit' }).fetch().then('...');
 *     // -> select "articles".* from "articles"
 *     // -> inner join "users" on "articles"."author_id" = "users"."id"
 *     // -> where "users"."name" like ?;
 *     // !> ["%Whit%"]
 *
 *     Article.objects.where({ 'author.name[contains]': 'Whit' })
 *       .orderBy('title', '-author.name')
 *       .limit(10)
 *       .offset(20)
 *       .fetch()
 *       .then('...');
 *     // -> select "articles".* from "articles"
 *     // -> inner join users on "articles"."author_id" = "users"."id"
 *     // -> where "users"."name" like ?
 *     // -> order by "articles"."title" asc "users"."name" desc
 *     // -> limit 10 offset 20;
 *     // !> ["%Whit%"]
 *
 *     Article.objects.with('author', 'comments').fetch().then('...');
 *     // -> select * from "articles";
 *     // -> select * from "users" where "id" in (?, ?);
 *     // !> [10,32]
 *     // -> select * from "comments" "id" in (?, ?, ?);
 *     // !> [12,43,73]
 *
 *     User.objects.where({ 'articles.title[contains]': 'news' }).unique()
 *     // -> select "users".* from "users"
 *     // -> inner join "articles" on "articles"."author_id" = "users"."id"
 *     // -> where "articles"."title" like ?
 *     // -> group by "users"."id";
 *     // !> ['%news%']
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
 *     user.createArticle({ title: 'Example' }).save().then(function(article) {
 *       // ...
 *     });
 *     // -> insert into "articles" ("title", "author_id") values ?, ?;
 *     // !> ["Example", 1]
 *
 *     user.addArticles(existingArticle1, existingArticle2).then('...');
 *     // -> update "articles" set "author_id" = ? where ."id" in (?, ?);
 *     // !> [1, 23, 84]
 *
 *     user.removeArticles(existingArticle1, existingArticle2).then('...');
 *     // -> update "articles" set "author_id" = null "id" in (?, ?);
 *     // !> [1, 2]
 *
 *     user.removeArticle(existingArticle1).then('...');
 *     // -> update "articles" set "author_id" = null "id" = ?;
 *     // !> [1]
 *
 *     user.clearArticles().then('...');
 *     // -> update "articles" set "author_id" = null "author_id" = ?;
 *     // !> [1]
 *
 *
 * ### Self Joins
 *
 *     Employee = db.model('employee').reopen({
 *       subordinates: hasMany('employee', { inverse: 'manager' }),
 *       manager: belongsTo('employee', { inverse: 'subordinates' })
 *     });
 *
 *     Employee.objects.where({ 'manager.id': 1 })
 *     // -> select "employees".* from "employees"
 *     // -> inner join "employees" "managers"
 *     // -> on "employees"."employee_id" = "managers"."id"
 *     // -> where "managers"."id" = ?
 *     // !> [1]
 *
 *     Employee.objects.join('manager').where({ id: 1 })
 *     // -> select "employees".* from "employees"
 *     // -> inner join "employees" "managers"
 *     // -> on "employees"."employee_id" = "managers"."id"
 *     // -> where "employees"."id" = ?
 *     // !> [1]
 *
 * #### When the relation name and the table name match
 *
 * This ambiguous naming should be avoided, but has been documented for
 * completeness.
 *
 * In the below example, the relation name, `nodes` is also the same as the
 * table name, `nodes`. The same basic rules apply as in the relational uses.
 * When using names within the `where` clauses, the prefix is assumed to be a
 * relation name if the relation exists. In this case, since the relation
 * exists, it will be used. This means that it is impossible to use the table
 * name to _actually_ represent the table name as part of the condition. The
 * table name _is_ automatically added to all fields that do not specify a
 * table name (see below), so in nearly all cases, this should not be a
 * problem. Again, it should be avoided.
 *
 *     Node = db.model('node').reopen({
 *       nodes: hasMany('node')
 *     });
 *
 *     Node.objects.join('nodes').where({ 'nodes.id': 1 })
 *     // -> select "nodes".* from "nodes"
 *     // -> inner join "nodes" "nodes_j1"
 *     // -> on "nodes"."node_id" = "nodes_j1"."id"
 *     // -> where "nodes_j1"."id" = ?
 *     // !> [1]
 *
 *     Node.objects.where({ 'nodes.id': 1 })
 *     // -> select "nodes".* from "nodes"
 *     // -> inner join "nodes" "nodes_j1"
 *     // -> on "nodes"."node_id" = "nodes_j1"."id"
 *     // -> where "nodes_j1"."id" = ?
 *     // !> [1]
 *
 * To specify a condition on the left hand side of the query (i.e.) to access
 * the original table that's being queried, simply don't provide the the table
 * name. This should come naturally, but a few examples should make this clear:
 *
 *     Node.objects.join('nodes').where({ id: 1 })
 *     // -> select "nodes".* from "nodes"
 *     // -> inner join "nodes" "nodes_j1"
 *     // -> on "nodes"."node_id" = "nodes_j1"."id"
 *     // -> where "nodes"."id" = ?
 *     // !> [1]
 *
 *     Node.objects.where({ id: 1 })
 *     // -> select * from "nodes" where "id" = ?
 *     // !> [1]
 *
 * @public
 * @constructor Model
 */
var Model = Class.extend(/** @lends Model# */ {
  init: function(properties) {
    this._super();
    this._attrs = {};
    this._dirtyAttributes = {};
    this._deletePending = false;
    this._deleteExecuted = false;
    this._inFlight = false;

    // cannot _.extend because it knows not to attempt to write properties that
    // aren't writable. we want to write the non-writable properties, though,
    // so that the proper exception is thrown.
    _.forEach(properties, function(value, key) {
      this[key] = value;
    }, this);
  },

  /**
   * Each model comes by default with an `pk` attribute. By default, this
   * corresponds to the `id` column in the database. If you use a different
   * column name in your database, you can override this property:
   *
   *     MyModel.reopen({
   *       pk: attr('identifier')
   *     });
   *
   * If you prefer to access your custom column by another name, you can add an
   * additional attribute, making the column accessible by both attributes:
   *
   *     MyModel.reopen({
   *       identifier: attr('identifier')
   *     });
   *
   * @type {Integer|?}
   */
  pk: attr('id'),

  /**
   * An alias for the `pk` property.
   *
   * @type {Integer|?}
   * @see {@link Model#pk}
   */
  id: property({ property: 'pk', writable: true }),
  idAttr: property({ property: 'pkAttr' }), // docs implied from `id` docs

  /**
   * Get an attribute by the database column name. This is the preferred way of
   * reading individual attributes rather than using {@link Model#attrs}.
   *
   * @method
   * @protected
   */
  getAttribute: function(attr) {
    return this.attrs[attr];
  },

  /**
   * Get an attribute by the database column name. This is the only acceptable
   * way to set attributes in `attrs`. Do set them directly.
   *
   * @method
   * @protected
   */
  setAttribute: function(attr, val) {
    this._dirtyAttributes[attr] = true;
    this._attrs[attr] = val;
  },

  /**
   * Mark an attribute as clean.
   *
   * @method
   * @protected
   */
  cleanAttribute: function(attr) {
    delete this._dirtyAttributes[attr];
  },

  /**
   * The base where query for accessing this individual object in the database.
   * Build select/update queries from this.
   *
   * @method
   * @private
   * @return {ModelQuery} The query object.
   */
  _whereQuery: function() {
    var where = _.pick(this.attrs, this.pkAttr);
    return this.__identity__.objects.where(where);
  },

  /**
   * An insert query for this object. This query also has an event listener
   * attached so that when the query is executed the primary key of the object
   * will be updated with the resulting value. The insert query will include
   * the primary key only when it's been set to some "truthy" value.
   *
   * @method
   * @private
   * @return {ModelQuery} The query object.
   */
  _insertQuery: function() {
    var pk = this.pkAttr;
    var attrs = this.pk ? this.attrs : _.omit(this.attrs, pk);
    var query = this.__identity__.objects.insert(attrs).returning(pk);
    return query.on('result', function(result) {
      this.pk = result[0][pk];
    }.bind(this));
  },

  /**
   * An update query for this object. This query will update the existing
   * object in the database with all of the attributes of the object.
   *
   * @method
   * @private
   * @return {ModelQuery} The query object.
   */
  _updateQuery: function() {
    var attrs = _.omit(this.attrs, this.pkAttr);
    return this._whereQuery().update(attrs);
  },

  /**
   * A delete query for this object. This query also has an event listener
   * attached so that when the query is executed the model will be updated and
   * marked as actually deleted (rather than being in a delete-pending state).
   *
   * @method
   * @private
   * @return {ModelQuery} The query object.
   */
  _deleteQuery: function() {
    return this._whereQuery().delete().on('result', function() {
      this._deleteExecuted = true;
      this._deletePending = false;
    }.bind(this));
  },

  /**
   * The insert/update/delete query for saving this object in the database.
   *
   * @method
   * @private
   * @return {ModelQuery} The query object.
   */
  _saveQuery: function() {
    var query;
    if (this.newRecord && !this.deleted) { query = this._insertQuery(); }
    else if (this.dirty && this.persisted) { query = this._updateQuery(); }
    else if (this.deleted && !this._deleteExecuted) { query = this._deleteQuery(); }
    return query;
  },

  /**
   * Save a model instance. Objects that are not {@link Model#persisted} will
   * cause an `insert` to occur. Objects that have been persisted, but are
   * {@link Model#dirty} will cause an `update` to occur. Otherwise, no action
   * will be taken.
   *
   * After the save occurs, the model will be marked as clean & persisted.
   *
   * Multiple saves of the same object at the same time will result in an
   * error.
   *
   * @method
   * @public
   * @param {Object} [options]
   * @param {Boolean} [options.method] Force the method to use when saving.
   * This can be either `insert` or `update`.
   * @return {Promise} A promise that will resolve with the current model when
   * complete.
   */
  save: BluebirdPromise.method(function(options) {

    if (this.inFlight) {
      throw new Error(util.format(
        'Cannot save %s while another save is in flight.',
        this.__identity__.__name__));
    }

    var query = this._saveQuery();
    var opts = options || {};
    if (opts.method === 'insert') { query = this._insertQuery(); }
    if (opts.method === 'update') { query = this._updateQuery(); }

    if (query) {
      this._inFlight = true;
      query = query
        .execute()
        .tap(this._afterSave.bind(this));
    }

    return BluebirdPromise.resolve(query).return(this);
  }),

  /**
   * This method is called after an object is successfully saved. It marks the
   * object as clean, no longer a new record, and no longer in flight.
   *
   * @method
   * @private
   */
  _afterSave: function() {
    this._dirtyAttributes = {};
    this._inFlight = false;
  },

  /**
   * Mark an object for deletion. It will be deleted once the model has been
   * saved.
   *
   * @method
   * @public
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   */
  delete: function() {
    this._deletePending = true;
    return Actionable.create(this.save.bind(this));
  },

  /**
   * The values of the database attributes, keyed by the actual column name.
   * This property is readonly, and altering the values the object is not
   * supported.
   *
   * @public
   * @readonly
   * @type {Object}
   */
  attrs: property(function() {
    return _.clone(this._attrs);
  }),

  /**
   * Whether this model is a new record, that is it does not have a
   * {@link Model#pk}. Objects that are new records can still be
   * {@link Model#dirty}.
   *
   * @public
   * @type {Boolean}
   */
  newRecord: property(function() {
    return !this.pk;
  }),

  /**
   * Whether this model is persisted, that is it neither a
   * {@link Model#newRecord} nor {@link Model#deleted}.
   *
   * @public
   * @type {Boolean}
   */
  persisted: property(function() {
    return !(this.newRecord || this.deleted);
  }),

  /**
   * Whether this model has been marked for deletion or has been deleted.
   *
   * @public
   * @type {Boolean}
   */
  deleted: property(function() {
    return this._deletePending || this._deleteExecuted;
  }),

  /**
   * Whether properties on this object have been changed since it was created
   * or loaded from the database.
   *
   * @public
   * @type {Boolean}
   */
  dirty: property(function() {
    return !!Object.keys(this._dirtyAttributes).length;
  }),

  /**
   * An array of all attributes that are dirty on this object.
   *
   * @public
   * @type {Array}
   */
  dirtyAttributes: property(function() {
    return Object.keys(this._dirtyAttributes);
  }),

  /**
   * Whether this object is in the process of being saved.
   *
   * @public
   * @type {Boolean}
   */
  inFlight: property()

});

Model.reopenClass(/** @lends Model */ {

  /**
   * Access to the {@link Manager} for all objects corresponding to this model.
   * This is the entry point to allow manipulation of the underlying data.
   * Subclasses can override this property to define a custom manager that
   * changes the default set of data that this model works with. Subclasses can
   * also add additional managers, allowing quick access to different data
   * sets (also sometimes referred to as scopes).
   *
   * @public
   * @type {Manager}
   */
  objects: Manager.create(),

  /**
   * Create a database attribute. The preferred user facing function for this
   * is {@link Database#attr}.
   *
   * @private
   * @function
   * @see {@link Database#attr}
   */
  attr: attr,

  /**
   * Create a has-many relationship. The preferred user facing function for
   * this is {@link Database#hasMany}.
   *
   * @private
   * @function
   * @see {@link Database#hasMany}
   */
  hasMany: HasMany.attr(),

  /**
   * Create a belongs-to relationship. The preferred user facing function for
   * this is {@link Database#belongsTo}.
   *
   * @private
   * @function
   * @see {@link Database#belongsTo}
   */
  belongsTo: BelongsTo.attr(),

  /**
   * The name of the database table. Subclasses can override this property. It
   * defaults to the pluralized, underscored class name.
   *
   * @public
   * @type {String}
   */
  tableName: property(function() {
    return this._tableName ||
      inflection.pluralize(_.snakeCase(this.__name__));
  }, { writable: true }),

  /**
   * A {@link Manager} will use this method to set attributes of a model when
   * it is loaded from the database via a query.
   *
   * @method
   * @protected
   * @param {Object} attrs The attributes read from the database.
   */
  load: function(attrs) {
    return this.create({
      _attrs: attrs
    });
  }

});

module.exports = Model.reopenClass({ __name__: 'Model' });
