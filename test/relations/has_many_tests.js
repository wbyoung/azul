'use strict';

require('../helpers');

var _ = require('lodash');
var InverseRelation = require('../../lib/relations/inverse');

var Article,
  User,
  user,
  articleObjects;

describe('Model.hasMany', __db(function() {
  /* global db, adapter */

  beforeEach(function() {
    var hasMany = db.hasMany;
    var attr = db.attr;

    Article = db.model('article').reopen({
      title: attr(),
      authorKey: attr('author_num'), // easy access to foreign key attr
    });
    User = db.model('user').reopen({
      username: attr(),
      articles: hasMany(Article, { foreignKey: 'authorKey' }),
    });
  });

  beforeEach(function() {
    user = User.fresh({ id: 1 });
    articleObjects = user.articleObjects;
  });

  beforeEach(function() {
    adapter.respond(/select.*from "users"/i,
      [{ id: 1, username: 'wbyoung' }]);
    adapter.respond(/select.*from "articles"/i,
      [{ id: 1, title: 'Journal', 'author_num': 1 }]);
    adapter.respond(/insert into "articles"/i,
      [{ id: 23 }]);
  });

  describe('definition', function() {
    it('does not need to provide name', function() {
      User.reopen({
        books: db.Model.hasMany(),
      });
      expect(user.booksRelation._relatedModel).to.eql(db.model('book'));
    });

    it('calculates foreign key from inverse', function() {
      User.reopen({
        books: db.Model.hasMany({ inverse: 'writer' }),
      });
      expect(user.booksRelation.foreignKey).to.eql('writerId');
      expect(user.booksRelation.foreignKeyAttr).to.eql('writer_id');
    });

    it('uses the primary key as the join key', function() {
      expect(user.articlesRelation.joinKey).to.eql(user.articlesRelation.primaryKey);
    });

    it('uses the foreign key as the inverse key', function() {
      expect(user.articlesRelation.inverseKey).to.eql(user.articlesRelation.foreignKey);
    });

    it('can generate an inverse relation', function() {
      var articlesRelation = User.__class__.prototype.articlesRelation;
      var inverse = articlesRelation.inverseRelation();
      expect(inverse).to.be.instanceof(InverseRelation.__class__);
      expect(inverse.joinKey).to.eql('authorKey');
      expect(inverse.joinKeyAttr).to.eql('author_num');
      expect(inverse.inverseKey).to.eql('pk');
      expect(inverse.inverseKeyAttr).to.eql('id');
    });
  });

  it('has related methods', function() {
    expect(User.__class__.prototype).to.have.ownProperty('articles');
    expect(user).to.have.property('articleObjects');
    expect(user).to.respondTo('createArticle');
    expect(user).to.respondTo('addArticle');
    expect(user).to.respondTo('addArticles');
    expect(user).to.respondTo('removeArticle');
    expect(user).to.respondTo('removeArticles');
    expect(user).to.respondTo('clearArticles');
  });

  describe('relation', function() {

    it('fetches related objects', function() {
      return articleObjects.fetch().then(function(articles) {
        expect(articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorKey: 1 }),
        ]);
        adapter.should.have.executed(
          'SELECT * FROM "articles" WHERE "author_num" = ?', [1]);
      });
    });

    it('fetches related objects when the result set is empty', function() {
      adapter.respond(/select.*from "articles"/i, []);
      return articleObjects.fetch().then(function(articles) {
        expect(articles).to.eql([]);
      });
    });

    it('caches the related objects query', function() {
      expect(user.articleObjects).to.equal(articleObjects);
    });

    it('throws when attempting to access un-loaded collection', function() {
      expect(function() {
        user.articles;
      }).to.throw(/articles.*not yet.*loaded/i);
    });

    it('does not consider relation loaded when fetched on a duplicated query', function() {
      return articleObjects.clone().fetch().then(function() {
        return user.articles;
      })
      .throw(new Error('Expected access to relation to fail.'))
      .catch(function(e) {
        expect(e.message).to.match(/articles.*not yet.*loaded/i);
      });
    });

    it('allows access loaded collection', function() {
      return articleObjects.fetch().then(function() {
        expect(user.articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorKey: 1 }),
        ]);
      });
    });

    it('does not load collection cache during model load', function() {
      return User.objects.fetchOne().then(function(fetchedUser) {
        expect(function() {
          fetchedUser.articles;
        }).to.throw(/articles.*not yet.*loaded/i);
      });
    });

    it('creates an empty collection cache on model create', function() {
      var user = User.create();
      expect(function() { user.articles; }).not.to.throw();
    });

    it('allows access loaded collection when the result set is empty', function() {
      adapter.respond(/select.*from "articles"/i, []);
      return articleObjects.fetch().then(function() {
        expect(user.articles).to.eql([]);
      });
    });

    it('can be filtered', function() {
      return articleObjects.where({ title: 'Azul' }).fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT * FROM "articles" ' +
        'WHERE ("author_num" = ?) AND ' +
        '("title" = ?)', [1, 'Azul']);
    });

    it('allows update', function() {
      return articleObjects.update({ title: 'Azul' }).should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'UPDATE "articles" SET "title" = ? ' +
        'WHERE "author_num" = ?', ['Azul', 1]);
    });

    it('allows delete', function() {
      return articleObjects.delete().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'DELETE FROM "articles" WHERE "author_num" = ?', [1]);
    });
  });

  describe('helpers', function() {
    it('allows create', function() {
      var article = user.createArticle({ title: 'Hello' });
      expect(article.authorKey).to.eql(user.id);
      expect(article).to.to.be.an.instanceOf(Article.__class__);
    });

    it('does not create collection cache during create', function() {
      var article = user.createArticle({ title: 'Hello' });
      expect(function() {
        user.articles;
      }).to.throw(/articles.*not yet.*loaded/i);
      expect(article).to.exist;
    });

    it('updates collection cache during create', function() {
      var article;
      return user.articleObjects.fetch().then(function() {
        article = user.createArticle({ title: 'Hello' });
      })
      .then(function() {
        expect(user.articles).to.contain(article);
      });
    });

    it('clears query cache during create', function() {
      var articleObjects = user.articleObjects;
      var article = user.createArticle({ title: 'Hello' });
      expect(user.articleObjects).to.not.equal(articleObjects);
      expect(article).to.exist;
    });

    it('allows add with existing objects', function() {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      return user.addArticle(article).then(function() {
        adapter.should.have.executed(
          'UPDATE "articles" SET "author_num" = ? ' +
          'WHERE "id" = ?', [1, 5]);
        expect(article).to.have.property('dirty', false);
      });
    });

    it('does not try to repeat addition updates', function() {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      user.addArticle(article);
      return user.save().then(function() {
        return user.save();
      })
      .then(function() {
        adapter.should.have.executed(
          'UPDATE "articles" SET "author_num" = ? ' +
          'WHERE "id" = ?', [1, 5]);
        expect(user.articlesRelation._getInFlightData(user)).to.eql({
          clear: false,
          add: [],
          remove: [],
        });
        expect(article).to.have.property('dirty', false);
      });
    });

    it('allows add with multiple existing objects', function() {
      var article1 = Article.fresh({ id: 5, title: 'Hello' });
      var article2 = Article.fresh({ id: 8, title: 'Hello' });
      return user.addArticles(article1, article2).then(function() {
        adapter.should.have.executed(
          'UPDATE "articles" SET "author_num" = ? ' +
          'WHERE "id" IN (?, ?)', [1, 5, 8]);
        expect(article1).to.have.property('dirty', false);
        expect(article2).to.have.property('dirty', false);
      });
    });

    it('allows add with unsaved objects', function() {
      var article = Article.fresh({ id: 12, title: 'Hello' });
      article.title = 'Renamed';
      return user.addArticle(article).then(function() {
        adapter.should.have.executed(
          'UPDATE "articles" SET "title" = ?, "author_num" = ? ' +
          'WHERE "id" = ?', ['Renamed', 1, 12]);
        expect(article).to.have.property('dirty', false);
      });
    });

    it('allows add with created objects', function() {
      var article = Article.create({ title: 'Hello' });
      return user.addArticle(article).then(function() {
        adapter.should.have.executed(
          'INSERT INTO "articles" ("title", "author_num") VALUES (?, ?) ' +
          'RETURNING "id"', ['Hello', 1]);
        expect(article).to.have.property('dirty', false);
      });
    });

    it('allows add via create helper', function() {
      var article = user.createArticle({ title: 'Hello' });
      return user.save().should.eventually.exist
      .meanwhile(article).should.have.property('dirty', false)
      .meanwhile(adapter).should.have.executed(
        'INSERT INTO "articles" ("title", "author_num") VALUES (?, ?) ' +
        'RETURNING "id"', ['Hello', 1]);
    });

    it('updates collection cache during add', function() {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      return user.articleObjects.fetch().then(function() {
        return user.addArticle(article);
      })
      .then(function() {
        expect(user.articles).to.contain(article);
      });
    });

    it('clears query cache during add', function() {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      var articleObjects = user.articleObjects;
      var chachedValues = [articleObjects];

      return articleObjects.fetch()
      .then(function() { user.addArticle(article); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
        chachedValues.push(user.articleObjects);
      })
      .then(function() { return user.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
      });
    });

    it('allows remove with existing objects', function() {
      var article = Article.fresh({ id: 5, title: 'Hello', authorKey: user.id });
      return user.removeArticle(article).then(function() {
        adapter.should.have.executed(
          'UPDATE "articles" SET "author_num" = ? ' +
          'WHERE "id" = ?', [undefined, 5]);
        expect(article).to.have.property('dirty', false);
      });
    });

    it('does not try to repeat removal updates', function() {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      user.removeArticle(article);
      return user.save().then(function() {
        return user.save();
      })
      .then(function() {
        adapter.should.have.executed(
          'UPDATE "articles" SET "author_num" = ? ' +
          'WHERE "id" = ?', [undefined, 5]);
        expect(user.articlesRelation._getInFlightData(user)).to.eql({
          clear: false,
          add: [],
          remove: [],
        });
        expect(article).to.have.property('dirty', false);
      });
    });

    it('allows remove with multiple existing objects', function() {
      var article1 = Article.fresh({ id: 5, title: 'Hello' });
      var article2 = Article.fresh({ id: 8, title: 'Hello' });
      return user.removeArticles(article1, article2).then(function() {
        adapter.should.have.executed(
          'UPDATE "articles" SET "author_num" = ? ' +
          'WHERE "id" IN (?, ?)', [undefined, 5, 8]);
        expect(article1).to.have.property('dirty', false);
        expect(article2).to.have.property('dirty', false);
      });
    });

    it('allows remove with unsaved objects', function() {
      var article = Article.fresh({ id: 12, title: 'Hello' });
      article.title = 'Renamed';
      return user.removeArticle(article).then(function() {
        adapter.should.have.executed(
          'UPDATE "articles" SET "title" = ?, "author_num" = ? ' +
          'WHERE "id" = ?', ['Renamed', undefined, 12]);
        expect(article).to.have.property('dirty', false);
      });
    });

    it('allows remove with created objects', function() {
      var article = Article.create({ title: 'Hello' });
      return user.removeArticle(article).then(function() {
        adapter.should.have.executed();
        expect(article).to.have.property('persisted', false);
      });
    });

    it('updates collection cache during remove', function() {
      var article;
      return user.articleObjects.fetch().then(function() {
        article = user.articles[0];
        return user.removeArticle(article);
      })
      .then(function() {
        expect(user.articles).to.not.contain(article);
      });
    });

    it('clears query cache during remove', function() {
      var articleObjects = user.articleObjects;
      var chachedValues = [articleObjects];

      return articleObjects.fetch()
      .then(function() { user.removeArticle(user.articles[0]); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
        chachedValues.push(user.articleObjects);
      })
      .then(function() { return user.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
      });
    });

    it('allows clear', function() {
      return user.clearArticles().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'UPDATE "articles" SET "author_num" = ? ' +
        'WHERE "author_num" = ?', [undefined, 1]);
    });

    it('updates collection cache during clear', function() {
      return user.articleObjects.fetch().then(function() {
        return user.clearArticles();
      })
      .then(function() {
        expect(user.articles).to.eql([]);
      });
    });

    it('clears query cache during clear', function() {
      var articleObjects = user.articleObjects;
      var chachedValues = [articleObjects];

      return articleObjects.fetch()
      .then(function() { user.clearArticles(); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
        chachedValues.push(user.articleObjects);
      })
      .then(function() { return user.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
      });
    });

    it('does not clear query cache during save', function() {
      var articleObjects = user.articleObjects;
      return user.save().then(function() {
        expect(articleObjects).to.equal(user.articleObjects);
      });
    });

    it('processes a complex sequence using add, remove, and clear', function() {
      var article1 = Article.fresh({ id: 1, title: '#1' });
      var article2 = Article.fresh({ id: 2, title: '#2' });
      var article3 = Article.fresh({ id: 3, title: '#3' });
      var article4 = Article.fresh({ id: 4, title: '#4' });
      var article5 = Article.fresh({ id: 5, title: '#5' });
      var article6 = Article.fresh({ id: 6, title: '#6' });
      var article7 = Article.fresh({ id: 7, title: '#7' });

      user.addArticles(article1, article2, article3, article7);
      user.removeArticle(article1);
      user.addArticles(article4);
      user.clearArticles(); // clear makes nothing above matter
      user.addArticle(article1);
      user.addArticles(article6, article7);
      user.removeArticles(article2, article5, article1, article4);
      user.addArticle(article2);
      user.removeArticles(article6);
      user.addArticle(article2);

      return user.save().then(function() {
        var executed = adapter.executedSQL;
        var clear = executed[0];
        expect(clear).to.eql(
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "author_num" = ?', [undefined, 1],]);
        // the order is not guaranteed between add & remove so they are sorted
        // based on the first argument (the argument corresponding to
        // SET "author_num" = ?)
        var remaining = executed.slice(1).sort(function(sql) {
          var args = sql[1];
          return args[0] === undefined;
        });
        expect(remaining).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" IN (?, ?)', [1, 7, 2],],
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" IN (?, ?)', [undefined, 5, 4],],
        ]);
      });
    });
  });

  describe('joins', function() {
    it('generates simple join queries', function() {
      return User.objects.join('articles').fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id"');
    });

    it('generates join queries that use where accessing fields in both types', function() {
      return User.objects.join('articles').where({
        username: 'wbyoung',
        title$contains: 'News',
      })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'WHERE "users"."username" = ? ' +
        'AND "articles"."title" LIKE ?', ['wbyoung', '%News%']);
    });

    it('defaults to the main model on ambiguous property', function() {
      return User.objects.join('articles').where({ id: 5 })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'WHERE "users"."id" = ?', [5]);
    });

    it('gives an error when there is an ambiguous property in two joins', function() {
      var Blog = db.model('blog');
      Blog.reopen({ title: db.attr() });
      User.reopen({ blogs: db.hasMany('blog') });

      expect(function() {
        User.objects
          .join('articles')
          .join('blogs')
          .where({ title: 'Azul Article/Azul Blog' });
      }).to.throw(/ambiguous.*"title".*"(articles|blogs)".*"(articles|blogs)"/i);
    });

    it('resolves fields specified by relation name', function() {
      return User.objects.join('articles').where({ 'articles.id': 5, })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'WHERE "articles"."id" = ?', [5]);
    });

    it('resolves fields specified by relation name & attr name', function() {
      return User.objects.join('articles').where({ 'articles.pk': 5, })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'WHERE "articles"."id" = ?', [5]);
    });

    it('automatically determines joins from conditions', function() {
      return User.objects.where({ 'articles.title': 'News', })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'WHERE "articles"."title" = ? ' +
        'GROUP BY "users"."id"', ['News']);
    });

    it('automatically determines joins from order by', function() {
      return User.objects.orderBy('-articles.pk')
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'GROUP BY "users"."id" ' +
        'ORDER BY "articles"."id" DESC');
    });

    it('handles attrs during automatic joining', function() {
      return User.objects.where({ 'articles.pk': 5, })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'WHERE "articles"."id" = ? ' +
        'GROUP BY "users"."id"', [5]);
    });

    it('does not automatically join based on attributes', function() {
      return User.objects.where({ 'username': 'wbyoung', })
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT * FROM "users" ' +
        'WHERE "username" = ?', ['wbyoung']);
    });

    it('works with a complex query', function() {
      return User.objects.where({ 'articles.title$contains': 'news', })
      .orderBy('username', '-articles.title')
      .limit(10)
      .offset(20)
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'WHERE "articles"."title" LIKE ? ' +
        'GROUP BY "users"."id" ' +
        'ORDER BY "users"."username" ASC, "articles"."title" DESC ' +
        'LIMIT 10 OFFSET 20', ['%news%']);
    });

    it('joins & orders across multiple relationships', function() {
      var Comment = db.model('comment');
      Comment.reopen({ body: db.attr() });
      Article.reopen({ comments: db.hasMany() });
      return User.objects.where({ 'articles.comments.body$contains': 'rolex', })
      .orderBy('username', 'articles.comments.body')
      .limit(10)
      .offset(20)
      .fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "articles" ON "articles"."author_num" = "users"."id" ' +
        'INNER JOIN "comments" ON "comments"."article_id" = "articles"."id" ' +
        'WHERE "comments"."body" LIKE ? ' +
        'GROUP BY "users"."id" ' +
        'ORDER BY "users"."username" ASC, "comments"."body" ASC ' +
        'LIMIT 10 OFFSET 20', ['%rolex%']);
    });

    it('gives a useful error when second bad relation is used for `join`', function() {
      expect(function() {
        User.objects.join('articles.streets');
      }).to.throw(/no relation.*"streets".*join.*user query.*articles/i);
    });
  });

  describe('pre-fetch', function() {
    it('executes multiple queries', function() {
      return User.objects.with('articles').fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT * FROM "users"',
        'SELECT * FROM "articles" WHERE "author_num" = ?', [1]);
    });

    it('works with all', function() {
      return User.objects.with('articles').all().fetch().should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT * FROM "users"',
        'SELECT * FROM "articles" WHERE "author_num" = ?', [1]);
    });

    it('caches related objects', function() {
      return User.objects.with('articles').fetch().get('0').then(function(foundUser) {
        expect(foundUser.id).to.eql(1);
        expect(foundUser.username).to.eql('wbyoung');
        expect(foundUser.articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorKey: 1 }),
        ]);
      });
    });

    it('works with multiple models each having multiple related objects', function() {
      var usersRegex = /select.*from "users".*order by "id"/i;
      var articlesRegex =
        /select.*from "articles" where "author_num" in \(\?, \?, \?\)/i;
      adapter.respond(usersRegex, [
        { id: 1, username: 'wbyoung' },
        { id: 2, username: 'kate' },
        { id: 4, username: 'sam' },
      ]);
      adapter.respond(articlesRegex, [
        { id: 3, title: 'Announcing Azul', 'author_num': 1 },
        { id: 5, title: 'Node.js ORM', 'author_num': 1 },
        { id: 9, title: 'Delicious Pancakes', 'author_num': 2 },
        { id: 8, title: 'Awesome Margaritas', 'author_num': 2 },
        { id: 4, title: 'Tasty Kale Salad', 'author_num': 2 },
        { id: 6, title: 'The Bipartisan System', 'author_num': 4 },
      ]);

      return User.objects.with('articles').orderBy('id').fetch().then(function(users) {
        expect(users[0].username).to.eql('wbyoung');
        expect(users[1].username).to.eql('kate');
        expect(users[2].username).to.eql('sam');
        expect(_.map(users[0].articles, 'title')).to.eql([
          'Announcing Azul', 'Node.js ORM',
        ]);
        expect(_.map(users[1].articles, 'title')).to.eql([
          'Delicious Pancakes', 'Awesome Margaritas', 'Tasty Kale Salad',
        ]);
        expect(_.map(users[2].articles, 'title')).to.eql([
          'The Bipartisan System',
        ]);
      });
    });

    it('works when some the objects have an empty result set', function() {
      var usersRegex = /select.*from "users".*order by "id"/i;
      var articlesRegex =
        /select.*from "articles" where "author_num" in \(\?, \?, \?\, \?\)/i;
      adapter.respond(usersRegex, [
        { id: 1, username: 'wbyoung' },
        { id: 2, username: 'kate' },
        { id: 3, username: 'vanessa' },
        { id: 4, username: 'sam' },
      ]);
      adapter.respond(articlesRegex, [
        { id: 3, title: 'Announcing Azul', 'author_num': 1 },
        { id: 5, title: 'Node.js ORM', 'author_num': 1 },
        { id: 6, title: 'The Bipartisan System', 'author_num': 4 },
      ]);

      return User.objects.with('articles').orderBy('id').fetch().then(function(users) {
        expect(users[0].username).to.eql('wbyoung');
        expect(users[1].username).to.eql('kate');
        expect(users[2].username).to.eql('vanessa');
        expect(users[3].username).to.eql('sam');
        expect(_.map(users[0].articles, 'title')).to.eql([
          'Announcing Azul', 'Node.js ORM',
        ]);
        expect(_.map(users[1].articles, 'title')).to.eql([]);
        expect(_.map(users[2].articles, 'title')).to.eql([]);
        expect(_.map(users[3].articles, 'title')).to.eql([
          'The Bipartisan System',
        ]);
      });
    });

    it('works when no objects are returned', function() {
      adapter.respond(/select.*from "users"/i, []);
      return User.objects.with('articles').fetch().then(function(articles) {
        expect(articles).to.eql([]);
      });
    });

    it('works via `fetchOne`', function() {
      return User.objects.where({ id: 1 }).with('articles').fetchOne()
      .then(function(fetchedUser) {
        expect(fetchedUser.articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorKey: 1 }),
        ]);
      });
    });

    it('works via `find`', function() {
      return User.objects.with('articles').find(1).then(function(fetchedUser) {
        expect(fetchedUser.articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorKey: 1 }),
        ]);
      });
    });
  });

  describe('internal methods', function() {
    it('handles disassociate', function() {
      var article = Article.fresh({ id: 5, title: 'Hello', authorKey: 5 });
      user.articlesRelation.disassociate(user, article);
      expect(article.authorKey).to.eql(undefined);
    });

    it('handles disassociate ignoring attrs', function() {
      var article = Article.fresh({ id: 5, title: 'Hello', authorKey: 5 });
      user.articlesRelation.disassociate(user, article, { attrs: false });
      expect(article.authorKey).to.eql(5);
    });
  });
}));
