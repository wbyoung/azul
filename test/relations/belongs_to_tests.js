'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');

require('../helpers/model');

var db,
  adapter,
  Article,
  Comment,
  User,
  article;

describe('Model.belongsTo', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var belongsTo = db.belongsTo;
    var attr = db.attr;

    Article = db.model('article').reopen({
      title: attr(),
      author: belongsTo('user'),
      authorKey: attr('author_id') // writable access to foreign key attr
    });
    Comment = db.model('comment').reopen({
      body: db.attr(),
      article: db.belongsTo('article')
    });
    User = db.model('user').reopen({
      username: attr()
    });
  });

  beforeEach(function() {
    article = Article.fresh({ id: 932, title: 'Azul News', authorKey: 623 });
  });

  beforeEach(function() {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'username'],
      rows: [{ id: 623, username: 'wbyoung' }]
    });
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title', 'author_id'],
      rows: [{ id: 448, title: 'Journal', 'author_id': 623 }]
    });
    adapter.intercept(/select.*from "comments"/i, {
      fields: ['id', 'body', 'article_id'],
      rows: [{ id: 384, body: 'Great Post!', 'article_id': 448 }]
    });
    adapter.intercept(/insert into "users"/i, {
      fields: ['id'],
      rows: [{ id: 838 }]
    });
    adapter.intercept(/insert into "articles"/i, {
      fields: ['id'],
      rows: [{ id: 78 }]
    });
  });

  describe('definition', function() {
    it('does not need to provide name', function() {
      Article.reopen({
        user: db.Model.belongsTo()
      });
      expect(article.userRelation._relatedModel).to.eql(db.model('user'));
    });

    it('uses the foreign key as the join key', function() {
      expect(article.authorRelation.joinKey).to.eql(article.authorRelation.foreignKey);
    });

    it('uses the primary key as the inverse key', function() {
      expect(article.authorRelation.inverseKey).to.eql(article.authorRelation.primaryKey);
    });
  });

  it('has related methods', function() {
    expect(Article.__class__.prototype).to.have.ownProperty('author');
    expect(Article.__class__.prototype).to.have.ownProperty('authorId');
    expect(article).to.respondTo('fetchAuthor');
    expect(article).to.respondTo('setAuthor');
  });

  describe('relation', function() {

    it('fetches related object', function(done) {
      article.fetchAuthor().then(function(user) {
        expect(user.attrs).to.eql({ id: 623, username: 'wbyoung' });
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]]
        ]);
      })
      .done(done, done);
    });

    it('caches the fetched object (one query for two fetches)', function(done) {
      article.fetchAuthor()
      .then(function() { return article.fetchAuthor(); })
      .then(function(user) {
        expect(user.attrs).to.eql({ id: 623, username: 'wbyoung' });
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]]
        ]);
      })
      .done(done, done);
    });

    it('gives an error when it cannot fetch the related object', function(done) {
      adapter.intercept(/select.*from "users"/i, {
        fields: ['id', 'username'],
        rows: []
      });
      article.fetchAuthor()
      .throw(new Error('Expected fetch to fail.'))
      .catch(function(e) {
        expect(e.message).to.match(/found no.*User.*author_id.*623/i);
      })
      .done(done, done);
    });

    it('does not fetch when the foreign key is not defined', function(done) {
      var unauthoredArticle = Article.fresh({ id: 932, title: 'Azul News' });
      unauthoredArticle.fetchAuthor().then(function(user) {
        expect(user).to.not.exist;
        expect(unauthoredArticle.author).to.not.exist;
        expect(adapter.executedSQL()).to.eql([]);
      })
      .done(done, done);
    });

    it('throws when attempting to access un-loaded item', function() {
      expect(function() {
        article.author;
      }).to.throw(/author.*not yet.*loaded/i);
    });

    it('allows access loaded item', function(done) {
      article.fetchAuthor().then(function() {
        expect(article.author.attrs).to.eql({ id: 623, username: 'wbyoung' });
      })
      .done(done, done);
    });

    it('does not load the item during model load', function(done) {
      Article.objects.fetchOne().then(function(fetchedArticle) {
        expect(function() {
          fetchedArticle.author;
        }).to.throw(/author.*not yet.*loaded/i);
      })
      .done(done, done);
    });
  });

  describe('helpers', function() {
    it('provides a getter method for the foreign key', function() {
      expect(article.authorId).to.eql(623);
    });

    it('does not provide a setter method for the foreign key', function() {
      expect(function() {
        article.authorId = 25;
      }).to.throw(/cannot set.*authorId/i);
    });

    it('allows create', function() {
      var user = article.createAuthor({ username: 'jill' });
      expect(article.author).to.equal(user);
      expect(user).to.to.be.an.instanceOf(User.__class__);
    });

    it('allows store with existing object', function(done) {
      article.author = User.fresh({ id: 3, username: 'jack' });
      article.save().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
           'WHERE "id" = ?', ['Azul News', 3, 932]]
        ]);
      })
      .done(done, done);
    });

    it('allows store with unsaved object', function(done) {
      var user = User.create({ username: 'jack' });
      article.author = user;
      article.save().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['INSERT INTO "users" ("username") VALUES (?) ' +
           'RETURNING "id"', ['jack']],
          ['UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
           'WHERE "id" = ?', ['Azul News', 838, 932]]
        ]);
      })
      .done(done, done);
    });

    it('allows store via constructor', function(done) {
      var user = User.create({ username: 'jack' });
      article = Article.create({ title: 'Azul News', author: user });
      article.save().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['INSERT INTO "users" ("username") VALUES (?) ' +
           'RETURNING "id"', ['jack']],
          ['INSERT INTO "articles" ("title", "author_id") VALUES (?, ?) ' +
           'RETURNING "id"', ['Azul News', 838]]
        ]);
      })
      .done(done, done);
    });
  });

  describe('joins', function() {
    it('generates simple join queries', function(done) {
      Article.objects.join('author').fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id"', []]
        ]);
      })
      .done(done, done);
    });

    it('can be made unique', function(done) {
      Article.objects.join('author').unique().fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'GROUP BY "articles"."id"', []]
        ]);
      })
      .done(done, done);
    });

    it('generates join queries that use where accessing fields in both types', function(done) {
      Article.objects.join('author').where({
        username: 'wbyoung',
        'title[contains]': 'News'
      }).fetch().then(function() {
        // note that this expectation depends on ordering of object
        // properties which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "users"."username" = ? ' +
           'AND "articles"."title" LIKE ?', ['wbyoung', '%News%']]
        ]);
      })
      .done(done, done);
    });

    it('defaults to the main model on ambiguous property', function(done) {
      Article.objects.join('author').where({ id: 5 })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "articles"."id" = ?', [5]]
        ]);
      })
      .done(done, done);
    });

    it('gives an error when there is an ambiguous property in two joins', function() {
      var belongsTo = db.belongsTo;
      var attr = db.attr;
      var Blog = db.model('blog');
      Blog.reopen({ name: attr() });
      User.reopen({ name: attr() });
      Article.reopen({ blog: belongsTo('blog') });

      var query = Article.objects
        .join('author')
        .join('blog')
        .where({ name: 'John/Azul Blog' });

      expect(function() {
        query.statement;
      }).to.throw(/ambiguous.*"name".*"(author|blog)".*"(author|blog)"/i);
    });

    it('resolves fields specified by relation name', function(done) {
      Article.objects.join('author').where({ 'author.id': 5, })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "users"."id" = ?', [5]]
        ]);
      })
      .done(done, done);
    });

    it('resolves the relation name when the attribute is not defined', function(done) {
      Article.objects.join('author').where({ 'author.dbonly_field': 5, })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "users"."dbonly_field" = ?', [5]]
        ]);
      })
      .done(done, done);
    });

    it('resolves fields specified by relation name & attr name', function(done) {
      Article.objects.join('author').where({ 'author.pk': 5, })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "users"."id" = ?', [5]]
        ]);
      })
      .done(done, done);
    });

    it('automatically determines joins from conditions', function(done) {
      Article.objects.where({ 'author.username': 'wbyoung', })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "users"."username" = ? ' +
           'GROUP BY "articles"."id"', ['wbyoung']]
        ]);
      })
      .done(done, done);
    });

    it('automatically determines joins from order by', function(done) {
      Article.objects.orderBy('-author.pk')
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'GROUP BY "articles"."id" ' +
           'ORDER BY "users"."id" DESC', []]
        ]);
      })
      .done(done, done);
    });

    it('handles attrs during automatic joining', function(done) {
      Article.objects.where({ 'author.pk': 5, })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "users"."id" = ? ' +
           'GROUP BY "articles"."id"', [5]]
        ]);
      })
      .done(done, done);
    });

    it('does not automatically join based on attributes', function(done) {
      Article.objects.where({ 'username': 'wbyoung', })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" ' +
           'WHERE "username" = ?', ['wbyoung']]
        ]);
      })
      .done(done, done);
    });

    it('works with a complex query', function(done) {
      Article.objects.where({ 'author.username[contains]': 'w', })
      .orderBy('title', '-author.name')
      .limit(10)
      .offset(20)
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "articles".* FROM "articles" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "users"."username" LIKE ? ' +
           'GROUP BY "articles"."id" ' +
           'ORDER BY "articles"."title" ASC, "users"."name" DESC ' +
           'LIMIT 10 OFFSET 20', ['%w%']]
        ]);
      })
      .done(done, done);
    });

    it('joins & orders across multiple relationships', function(done) {
      Comment.objects.where({ 'article.author.username[contains]': 'w', })
      .orderBy('title', 'article.author.name')
      .limit(10)
      .offset(20)
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "comments".* FROM "comments" ' +
           'INNER JOIN "articles" ON "comments"."article_id" = "articles"."id" ' +
           'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
           'WHERE "users"."username" LIKE ? ' +
           'GROUP BY "comments"."id" ' +
           'ORDER BY "articles"."title" ASC, "users"."name" ASC ' +
           'LIMIT 10 OFFSET 20', ['%w%']]
        ]);
      })
      .done(done, done);
    });

    it('gives a useful error when second bad relation is used for `join`', function() {
      expect(function() {
        Comment.objects.join('article.streets');
      }).to.throw(/no relation.*"streets".*join.*comment query.*article/i);
    });
  });

  describe('pre-fetch', function() {
    it('executes multiple queries', function(done) {
      Article.objects.with('author').fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles"', []],
          ['SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]]
        ]);
      })
      .done(done, done);
    });

    it('caches related objects', function(done) {
      Article.objects.with('author').fetch().get('0').then(function(foundArticle) {
        expect(foundArticle.id).to.eql(448);
        expect(foundArticle.authorId).to.eql(623);
        expect(foundArticle.author).to.eql(
          User.fresh({ id: 623, username: 'wbyoung' })
        );
      })
      .done(done, done);
    });

    it('works with models each having multiple related objects', function(done) {
      var articlesRegex = /select.*from "articles".*order by "id"/i;
      var usersRegex =
        /select.*from "users" where "id" in \(\?, \?, \?\) limit 3/i;
      adapter.intercept(articlesRegex, {
        fields: ['id', 'title', 'author_id'],
        rows: [
          { id: 3, title: 'Announcing Azul', 'author_id': 1 },
          { id: 4, title: 'Tasty Kale Salad', 'author_id': 2 },
          { id: 5, title: 'Node.js ORM', 'author_id': 1 },
          { id: 6, title: 'The Bipartisan System', 'author_id': 4 },
          { id: 8, title: 'Awesome Margaritas', 'author_id': 2 },
          { id: 9, title: 'Delicious Pancakes', 'author_id': 2 }
        ]
      });
      adapter.intercept(usersRegex, {
        fields: ['id', 'username'],
        rows: [
          { id: 1, username: 'wbyoung' },
          { id: 4, username: 'sam' },
          { id: 2, username: 'kate' }
        ]
      });

      Article.objects.with('author').orderBy('id').fetch().then(function(articles) {
        expect(_(articles).map('title').value()).to.eql([
          'Announcing Azul', 'Tasty Kale Salad', 'Node.js ORM',
          'The Bipartisan System', 'Awesome Margaritas', 'Delicious Pancakes'
        ]);
        expect(_(articles).map('author').map('username').value()).to.eql([
          'wbyoung', 'kate', 'wbyoung', 'sam', 'kate', 'kate'
        ]);
      })
      .done(done, done);
    });

    it('works when the related value is sometimes absent', function(done) {
      var articlesRegex = /select.*from "articles".*order by "id"/i;
      var usersRegex =
        /select.*from "users" where "id" in \(\?, \?\) limit 2/i;
      adapter.intercept(articlesRegex, {
        fields: ['id', 'title', 'author_id'],
        rows: [
          { id: 3, title: 'Announcing Azul', 'author_id': 874 },
          { id: 4, title: 'Tasty Kale Salad', 'author_id': null },
          { id: 6, title: 'The Bipartisan System', 'author_id': 4 },
        ]
      });
      adapter.intercept(usersRegex, {
        fields: ['id', 'username'],
        rows: [{ id: 874, username: 'wbyoung' }, { id: 4, username: 'kate' }]
      });

      Article.objects.with('author').orderBy('id').fetch().then(function(articles) {
        expect(_(articles).map('title').value()).to.eql([
          'Announcing Azul', 'Tasty Kale Salad', 'The Bipartisan System'
        ]);
        expect(_.map(articles, 'author')).to.eql([
          User.fresh({ id: 874, username: 'wbyoung' }), null,
          User.fresh({ id: 4, username: 'kate' })
        ]);
      })
      .done(done, done);
    });

    it('works when no objects are returned', function(done) {
      adapter.intercept(/select.*from "articles"/i, {
        fields: ['id', 'title', 'author_id'],
        rows: []
      });
      Article.objects.with('author').fetch().then(function(articles) {
        expect(articles).to.eql([]);
      })
      .done(done, done);
    });

    it('gives an error when it cannot find the related object', function(done) {
      adapter.intercept(/select.*from "users"/i, {
        fields: ['id', 'username'],
        rows: []
      });
      Article.objects.with('author').fetch()
      .throw(new Error('Expected fetch to fail.'))
      .catch(function(e) {
        expect(e.message).to.match(/found no.*User.*author_id.*623/i);
      })
      .done(done, done);
    });

    it('works via `fetchOne`', function(done) {
      Article.objects.where({ id: 1 }).with('author').fetchOne()
      .then(function(fetchedArticle) {
        expect(fetchedArticle.author).to.eql(
          User.fresh({ id: 623, username: 'wbyoung' })
        );
      })
      .done(done, done);
    });

    it('works via `find`', function(done) {
      Article.objects.with('author').find(1).then(function(fetchedArticle) {
        expect(fetchedArticle.author).to.eql(
          User.fresh({ id: 623, username: 'wbyoung' })
        );
      })
      .done(done, done);
    });

    it('handles multiple items at once', function(done) {
      var Blog = db.model('blog');
      Blog.reopen({ name: db.attr() });
      Article.reopen({ blog: db.belongsTo('blog') });
      adapter.intercept(/select.*from "articles"/i, {
        fields: ['id', 'title'],
        rows: [{ id: 448, title: 'Journal', 'author_id': 623, 'blog_id': 82 }]
      });
      adapter.intercept(/select.*from "blogs"/i, {
        fields: ['id', 'name'],
        rows: [{ id: 82, name: 'Azul News' }]
      });

      Article.objects.with('author', 'blog').find(1).then(function(foundArticle) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" WHERE "id" = ? LIMIT 1', [1]],
          ['SELECT * FROM "blogs" WHERE "id" = ? LIMIT 1', [82]],
          ['SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]],
        ]);
        expect(foundArticle.author).to.eql(
          User.fresh({ id: 623, username: 'wbyoung' })
        );
        expect(foundArticle.blog).to.eql(
          Blog.fresh({ id: 82, name: 'Azul News' })
        );
      })
      .done(done, done);
    });

    it('works across multiple relationships', function(done) {
      Comment.objects.with('article.author').find(384)
      .then(function(foundComment) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "comments" WHERE "id" = ? LIMIT 1', [384]],
          ['SELECT * FROM "articles" WHERE "id" = ? LIMIT 1', [448]],
          ['SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]],
        ]);
        expect(foundComment.article.author).to.eql(
          User.fresh({ id: 623, username: 'wbyoung' })
        );
      })
      .done(done, done);
    });
  });

  describe('internal methods', function() {
    it('handles disassociate', function() {
      var user = User.fresh({ id: 4, username: 'jack' });
      article.authorKey = 5;
      article.authorRelation.disassociate(article, user);
      expect(article.authorKey).to.eql(undefined);
    });

    it('handles disassociate ignoring attrs', function() {
      var user = User.fresh({ id: 4, username: 'jack' });
      article.authorKey = 5;
      article.authorRelation.disassociate(article, user, { attrs: false });
      expect(article.authorKey).to.eql(5);
    });
  });
});
