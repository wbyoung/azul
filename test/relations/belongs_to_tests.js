'use strict';

require('../helpers');

var _ = require('lodash');
var InverseRelation = require('../../lib/relations/inverse');

var Article,
  Comment,
  User,
  article;

describe('Model.belongsTo', __db(function() {
  /* global db, adapter */

  beforeEach(function() {
    var belongsTo = db.belongsTo;
    var attr = db.attr;

    Article = db.model('article').reopen({
      title: attr(),
      author: belongsTo('user'),
      authorKey: attr('author_id'), // writable access to foreign key attr
    });
    Comment = db.model('comment').reopen({
      body: db.attr(),
      article: db.belongsTo('article'),
    });
    User = db.model('user').reopen({
      username: attr(),
    });
  });

  beforeEach(function() {
    article = Article.$({ id: 932, title: 'Azul News', authorKey: 623 });
  });

  beforeEach(function() {
    adapter.respond(/select.*from "users"/i,
      [{ id: 623, username: 'wbyoung' }]);
    adapter.respond(/select.*from "articles"/i,
      [{ id: 448, title: 'Journal', 'author_id': 623 }]);
    adapter.respond(/select.*from "comments"/i,
      [{ id: 384, body: 'Great Post!', 'article_id': 448 }]);
    adapter.respond(/insert into "users"/i,
      [{ id: 838 }]);
    adapter.respond(/insert into "articles"/i,
      [{ id: 78 }]);
  });

  describe('definition', function() {
    it('does not need to provide name', function() {
      Article.reopen({
        user: db.Model.belongsTo(),
      });
      expect(article.userRelation._relatedModel).to.eql(db.model('user'));
    });

    it('uses the foreign key as the join key', function() {
      expect(article.authorRelation.joinKey).to.eql(article.authorRelation.foreignKey);
    });

    it('uses the primary key as the inverse key', function() {
      expect(article.authorRelation.inverseKey).to.eql(article.authorRelation.primaryKey);
    });

    it('allows customization of the database attribute', function() {
      Article.reopen({
        user: db.Model.belongsTo(),
        userId: db.attr('user_foreign_key'),
      });
      expect(article.userRelation.foreignKeyAttr).to.eql('user_foreign_key');
    });

    it('can generate an inverse relation', function() {
      var authorRelation = Article.__class__.prototype.authorRelation;
      var inverse = authorRelation.inverseRelation();
      expect(inverse).to.be.instanceof(InverseRelation.__class__);
      expect(inverse.joinKey).to.eql('pk');
      expect(inverse.joinKeyAttr).to.eql('id');
      expect(inverse.inverseKey).to.eql('authorId');
      expect(inverse.inverseKeyAttr).to.eql('author_id');
    });
  });

  it('has related methods', function() {
    expect(Article.__class__.prototype).to.have.ownProperty('author');
    expect(Article.__class__.prototype).to.have.ownProperty('authorId');
    expect(article).to.respondTo('fetchAuthor');
    expect(article).to.respondTo('setAuthor');
  });

  describe('relation', function() {

    it('fetches related object', function() {
      return article.fetchAuthor().then(function(user) {
        expect(user.attrs).to.eql({ id: 623, username: 'wbyoung' });
        adapter.should.have.executed(
          'SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]);
      });
    });

    it('caches the fetched object (one query for two fetches)', function() {
      return article.fetchAuthor()
      .then(function() { return article.fetchAuthor(); })
      .then(function(user) {
        expect(user.attrs).to.eql({ id: 623, username: 'wbyoung' });
        adapter.should.have.executed(
          'SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]);
      });
    });

    it('gives an error when it cannot fetch the related object', function() {
      adapter.respond(/select.*from "users"/i, []);
      return article.fetchAuthor()
      .throw(new Error('Expected fetch to fail.'))
      .catch(function(e) {
        expect(e.message).to.match(/found no.*User.*author_id.*623/i);
      });
    });

    it('does not fetch when the foreign key is not defined', function() {
      var unauthoredArticle = Article.$({ id: 932, title: 'Azul News' });
      return unauthoredArticle.fetchAuthor().then(function(user) {
        expect(user).to.not.exist;
        expect(unauthoredArticle.author).to.not.exist;
        adapter.should.have.executed(/* nothing */);
      });
    });

    it('throws when attempting to access un-loaded item', function() {
      expect(function() {
        article.author;
      }).to.throw(/author.*not yet.*loaded/i);
    });

    it('allows access loaded item', function() {
      return article.fetchAuthor().then(function() {
        expect(article.author.attrs).to.eql({ id: 623, username: 'wbyoung' });
      });
    });

    it('does not load the item during model load', function() {
      return Article.objects.fetchOne().then(function(fetchedArticle) {
        expect(function() {
          fetchedArticle.author;
        }).to.throw(/author.*not yet.*loaded/i);
      });
    });

    it('sets foreign key when item saved after assigned', function() {
      var user = User.create({ username: 'cocoabythefire' });
      var article = Article.create({ title: 'Issue 12', author: user });
      return user.save().then(function() {
        return article.save();
      })
      .then(function() {
        expect(user.id).to.eql(838);
        expect(article.id).to.eql(78);
        adapter.should.have.executed(
          'INSERT INTO "users" ("username") VALUES (?) ' +
          'RETURNING "id"', ['cocoabythefire'],
          'INSERT INTO "articles" ("title", "author_id") VALUES (?, ?) ' +
          'RETURNING "id"', ['Issue 12', 838]);
      });
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

    it('does not allow use of foreign key setter via constructor', function() {
      expect(function() {
        Article.create({ authorId: 25 });
      }).to.throw(/cannot set.*authorId/i);
    });

    it('allows create', function() {
      var user = article.createAuthor({ username: 'jill' });
      expect(article.author).to.equal(user);
      expect(user).to.to.be.an.instanceOf(User.__class__);
      expect(article).to.have.property('author').that.equals(user);
    });

    it('allows store with existing object', function() {
      article.author = User.$({ id: 3, username: 'jack' });
      return article.save().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
        'WHERE "id" = ?', ['Azul News', 3, 932]);
    });

    it('allows save to clear relationship', function() {
      article.author = null;
      return article.save().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
        'WHERE "id" = ?', ['Azul News', undefined, 932]);
    });

    it('allows store with unsaved object', function() {
      var user = User.create({ username: 'jack' });
      article.author = user;
      return article.save().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'INSERT INTO "users" ("username") VALUES (?) ' +
        'RETURNING "id"', ['jack'],
        'UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
        'WHERE "id" = ?', ['Azul News', 838, 932]);
    });

    it('allows store via constructor', function() {
      var user = User.create({ username: 'jack' });
      article = Article.create({ title: 'Azul News', author: user });
      return article.save().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'INSERT INTO "users" ("username") VALUES (?) ' +
        'RETURNING "id"', ['jack'],
        'INSERT INTO "articles" ("title", "author_id") VALUES (?, ?) ' +
        'RETURNING "id"', ['Azul News', 838]);
    });
  });

  describe('joins', function() {
    it('generates simple join queries', function() {
      return Article.objects.join('author').fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id"');
    });

    it('can be made unique', function() {
      return Article.objects.join('author').unique().fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'GROUP BY "articles"."id"');
    });

    it('generates join queries that use where accessing fields in both types', function() {
      return Article.objects.join('author').where({
        username: 'wbyoung',
        title$contains: 'News',
      })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."username" = ? ' +
        'AND "articles"."title" LIKE ?', ['wbyoung', '%News%']);
    });

    it('defaults to the main model on ambiguous property', function() {
      return Article.objects.join('author').where({ id: 5 })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "articles"."id" = ?', [5]);
    });

    it('gives an error when there is an ambiguous property in two joins', function() {
      var belongsTo = db.belongsTo;
      var attr = db.attr;
      var Blog = db.model('blog');
      Blog.reopen({ name: attr() });
      User.reopen({ name: attr() });
      Article.reopen({ blog: belongsTo('blog') });

      expect(function() {
        Article.objects
          .join('author')
          .join('blog')
          .where({ name: 'John/Azul Blog' });
      }).to.throw(/ambiguous.*"name".*"(author|blog)".*"(author|blog)"/i);
    });

    it('resolves fields specified by relation name', function() {
      return Article.objects.join('author').where({ 'author.id': 5, })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."id" = ?', [5]);
    });

    it('resolves fields specified by relation name & attr name', function() {
      return Article.objects.join('author').where({ 'author.pk': 5, })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."id" = ?', [5]);
    });

    it('automatically determines joins from conditions', function() {
      return Article.objects.where({ 'author.username': 'wbyoung', })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."username" = ? ' +
        'GROUP BY "articles"."id"', ['wbyoung']);
    });

    it('automatically determines joins from order by', function() {
      return Article.objects.orderBy('-author.pk')
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'GROUP BY "articles"."id" ' +
        'ORDER BY "users"."id" DESC');
    });

    it('handles attrs during automatic joining', function() {
      return Article.objects.where({ 'author.pk': 5, })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."id" = ? ' +
        'GROUP BY "articles"."id"', [5]);
    });

    it('handles relation objects during automatic joining', function() {
      var user = User.$({ id: 623, username: 'alex' });
      return Article.objects.where({ 'author': user, })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."id" = ? ' +
        'GROUP BY "articles"."id"', [623]);
    });

    it('gives a useful error when bad relation is used in `where`', function() {
      expect(function() {
        Article.objects.where({ 'author.norelation.id': 5, });
      }).to.throw(/invalid relation.*"author.norelation".*article query.*could not find.*"norelation"/i);
    });

    it('gives a useful error when bad attr is used in `where`', function() {
      expect(function() {
        Article.objects.where({ 'author.invalidAttr': 5, });
      }).to.throw(/invalid field.*"author.invalidAttr".*article query.*user class/i);
    });

    it('handles fields when joining tables (not relations)', function() {
      var query = Article.objects.where({ 'dbTable.id': 5, }).join('dbTable', 'inner');
      expect(query.sql).to.eql('SELECT "articles".* FROM "articles" ' +
       'INNER JOIN "dbTable" ON TRUE ' +
       'WHERE "dbTable"."id" = ?');
      expect(query.args).to.eql([5]);
    });

    it('does not automatically join based on attributes', function() {
      expect(function() {
        Article.objects.where({ 'username': 'wbyoung' });
      }).to.throw(/invalid field.*"username".*article query.*article class/i);
    });

    it('works with a complex query', function() {
      return Article.objects.where({ 'author.username$contains': 'w', })
      .orderBy('title', '-author.username')
      .limit(10)
      .offset(20)
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "articles".* FROM "articles" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."username" LIKE ? ' +
        'GROUP BY "articles"."id" ' +
        'ORDER BY "articles"."title" ASC, "users"."username" DESC ' +
        'LIMIT 10 OFFSET 20', ['%w%']);
    });

    it('joins & orders across multiple relationships', function() {
      return Comment.objects.where({ 'article.author.username$contains': 'w', })
      .orderBy('title', 'article.author.username')
      .limit(10)
      .offset(20)
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "comments".* FROM "comments" ' +
        'INNER JOIN "articles" ON "comments"."article_id" = "articles"."id" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."username" LIKE ? ' +
        'GROUP BY "comments"."id" ' +
        'ORDER BY "articles"."title" ASC, "users"."username" ASC ' +
        'LIMIT 10 OFFSET 20', ['%w%']);
    });

    it('joins across multiple relationships (using object)', function() {
      var user = User.$({ id: 623, username: 'alex' });
      return Comment.objects.where({ 'article.author': user, })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "comments".* FROM "comments" ' +
        'INNER JOIN "articles" ON "comments"."article_id" = "articles"."id" ' +
        'INNER JOIN "users" ON "articles"."author_id" = "users"."id" ' +
        'WHERE "users"."id" = ? ' +
        'GROUP BY "comments"."id"', [623]);
    });

    it('gives a useful error when second bad relation is used for `join`', function() {
      expect(function() {
        Comment.objects.join('article.streets');
      }).to.throw(/no relation.*"streets".*join.*comment query.*article/i);
    });
  });

  describe('pre-fetch', function() {
    it('executes multiple queries', function() {
      return Article.objects.with('author').fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT * FROM "articles"',
        'SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]);
    });

    it('works with all', function() {
      return Article.objects.with('author').all().fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT * FROM "articles"',
        'SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]);
    });

    it('caches related objects', function() {
      return Article.objects.with('author').fetch().get('0').then(function(foundArticle) {
        expect(foundArticle.id).to.eql(448);
        expect(foundArticle.authorId).to.eql(623);
        expect(foundArticle.author).to.eql(
          User.$({ id: 623, username: 'wbyoung' })
        );
      });
    });

    it('works with models each having multiple related objects', function() {
      var articlesRegex = /select.*from "articles".*order by "id"/i;
      var usersRegex =
        /select.*from "users" where "id" in \(\?, \?, \?\) limit 3/i;
      adapter.respond(articlesRegex, [
        { id: 3, title: 'Announcing Azul', 'author_id': 1 },
        { id: 4, title: 'Tasty Kale Salad', 'author_id': 2 },
        { id: 5, title: 'Node.js ORM', 'author_id': 1 },
        { id: 6, title: 'The Bipartisan System', 'author_id': 4 },
        { id: 8, title: 'Awesome Margaritas', 'author_id': 2 },
        { id: 9, title: 'Delicious Pancakes', 'author_id': 2 },
      ]);
      adapter.respond(usersRegex, [
        { id: 1, username: 'wbyoung' },
        { id: 4, username: 'sam' },
        { id: 2, username: 'kate' },
      ]);

      return Article.objects.with('author').orderBy('id').fetch().then(function(articles) {
        expect(_(articles).map('title').value()).to.eql([
          'Announcing Azul', 'Tasty Kale Salad', 'Node.js ORM',
          'The Bipartisan System', 'Awesome Margaritas', 'Delicious Pancakes',
        ]);
        expect(_(articles).map('author').map('username').value()).to.eql([
          'wbyoung', 'kate', 'wbyoung', 'sam', 'kate', 'kate',
        ]);
      });
    });

    it('works when the related value is sometimes absent', function() {
      var articlesRegex = /select.*from "articles".*order by "id"/i;
      var usersRegex =
        /select.*from "users" where "id" in \(\?, \?\) limit 2/i;
      adapter.respond(articlesRegex, [
        { id: 3, title: 'Announcing Azul', 'author_id': 874 },
        { id: 4, title: 'Tasty Kale Salad', 'author_id': null },
        { id: 6, title: 'The Bipartisan System', 'author_id': 4 },
      ]);
      adapter.respond(usersRegex,
        [{ id: 874, username: 'wbyoung' }, { id: 4, username: 'kate' }]);

      return Article.objects.with('author').orderBy('id').fetch().then(function(articles) {
        expect(_(articles).map('title').value()).to.eql([
          'Announcing Azul', 'Tasty Kale Salad', 'The Bipartisan System',
        ]);
        expect(_.map(articles, 'author')).to.eql([
          User.$({ id: 874, username: 'wbyoung' }), null,
          User.$({ id: 4, username: 'kate' }),
        ]);
      });
    });

    it('works when no objects are returned', function() {
      adapter.respond(/select.*from "articles"/i, []);
      return Article.objects.with('author').fetch().then(function(articles) {
        expect(articles).to.eql([]);
      });
    });

    it('gives an error when it cannot find the related object', function() {
      adapter.respond(/select.*from "users"/i, []);
      return Article.objects.with('author').fetch()
      .throw(new Error('Expected fetch to fail.'))
      .catch(function(e) {
        expect(e.message).to.match(/found no.*User.*author_id.*623/i);
      });
    });

    it('works via `fetchOne`', function() {
      return Article.objects.where({ id: 1 }).with('author').fetchOne()
      .then(function(fetchedArticle) {
        expect(fetchedArticle.author).to.eql(
          User.$({ id: 623, username: 'wbyoung' })
        );
      });
    });

    it('works via `find`', function() {
      return Article.objects.with('author').find(1).then(function(fetchedArticle) {
        expect(fetchedArticle.author).to.eql(
          User.$({ id: 623, username: 'wbyoung' })
        );
      });
    });

    it('handles multiple items at once', function() {
      var Blog = db.model('blog');
      Blog.reopen({ name: db.attr() });
      Article.reopen({ blog: db.belongsTo('blog') });
      adapter.respond(/select.*from "articles"/i,
        [{ id: 448, title: 'Journal', 'author_id': 623, 'blog_id': 82 }]);
      adapter.respond(/select.*from "blogs"/i,
        [{ id: 82, name: 'Azul News' }]);

      return Article.objects.with('author', 'blog').find(1).then(function(foundArticle) {
        adapter.should.have.executed(
          'SELECT * FROM "articles" WHERE "id" = ? LIMIT 1', [1],
          'SELECT * FROM "blogs" WHERE "id" = ? LIMIT 1', [82],
          'SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]);
        expect(foundArticle.author).to.eql(
          User.$({ id: 623, username: 'wbyoung' })
        );
        expect(foundArticle.blog).to.eql(
          Blog.$({ id: 82, name: 'Azul News' })
        );
      });
    });

    it('works across multiple relationships', function() {
      return Comment.objects.with('article.author').find(384)
      .then(function(foundComment) {
        adapter.should.have.executed(
          'SELECT * FROM "comments" WHERE "id" = ? LIMIT 1', [384],
          'SELECT * FROM "articles" WHERE "id" = ? LIMIT 1', [448],
          'SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [623]);
        expect(foundComment.article.author).to.eql(
          User.$({ id: 623, username: 'wbyoung' })
        );
      });
    });
  });

  describe('internal methods', function() {
    it('handles disassociate', function() {
      var user = User.$({ id: 4, username: 'jack' });
      article.authorKey = 5;
      article.authorRelation.disassociate(article, user);
      expect(article.authorKey).to.eql(undefined);
    });

    it('handles disassociate ignoring attrs', function() {
      var user = User.$({ id: 4, username: 'jack' });
      article.authorKey = 5;
      article.authorRelation.disassociate(article, user, { attrs: false });
      expect(article.authorKey).to.eql(5);
    });
  });
}));
