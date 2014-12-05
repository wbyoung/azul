'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');

require('../helpers/model');

var db,
  adapter,
  Article,
  User;

describe('Model.hasMany+belongsTo', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var hasMany = db.hasMany;
    var belongsTo = db.belongsTo;
    var attr = db.attr;

    Article = db.model('article').reopen({
      title: attr(),
      author: belongsTo('user')
    });
    User = db.model('user').reopen({
      username: attr(),
      articles: hasMany('article', { inverse: 'author' })
    });
  });

  beforeEach(function() {
    this.author = User.fresh({ id: 395, username: 'miles' });
    this.article = Article.fresh({ id: 828, title: 'Dog Psychology' });
  });

  beforeEach(function() {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'username'],
      rows: [{ id: 1, username: 'wbyoung' }]
    });
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: 'Journal', 'author_id': 1 }]
    });
    adapter.intercept(/insert into "users"/i, {
      fields: ['id'],
      rows: [{ id: 43 }]
    });
  });

  describe('when creating via belongsTo', function() {

    beforeEach(function() {
      this.author = this.article.createAuthor({ username: 'phil' });
    });

    it('creates hasMany collection cache', function() {
      expect(this.author.articles).to.eql([this.article]);
    });
  });

  describe('when creating via hasMany', function() {
    beforeEach(function() {
      this.article = this.author.createArticle({ title: 'Hello' });
    });

    it('creates an object of the correct type', function() {
      expect(this.article).to.to.be.an.instanceOf(Article.__class__);
    });

    it('sets inverse/belongsTo attribute', function() {
      expect(this.article.author).to.equal(this.author);
    });

  });

  describe('when adding existing object via hasMany', function() {
    beforeEach(function() {
      this.author.addArticle(this.article);
    });

    it('sets foreign key', function() {
      expect(this.article.authorId).to.eql(this.author.id);
    });

    it('sets related object', function() {
      expect(this.article.author).to.equal(this.author);
    });

    describe('when executed', function() {
      beforeEach(function(done) {
        this.author.save().then(function() { done(); }, done);
      });

      it('executes the proper sql', function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? WHERE "id" = ?', [395, 828]]
        ]);
      });
    });
  });

  describe('when removing existing object via hasMany', function() {
    beforeEach(function() {
      this.article.author = this.author;
      this.author.removeArticle(this.article);
    });

    it('clears foreign key', function() {
      expect(this.article.authorId).to.not.exist;
    });

    it('clears related object', function() {
      expect(this.article.author).to.not.exist;
    });

    describe('when executed', function() {
      beforeEach(function(done) {
        this.author.save().then(function() { done(); }, done);
      });

      it('executes the proper sql', function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" = ?', [undefined, 828]]
        ]);
      });
    });
  });

  describe('when a hasMany relationship is pre-fetched', function() {
    var users;

    beforeEach(function(done) {
      User.objects.with('articles').fetch().then(function(result) {
        users = result;
      })
      .then(done, done);
    });

    it('caches the relevant belongsTo objects', function() {
      var user = users[0];
      expect(user.articles[0].author).to.eql(user);
    });
  });

  describe('when hasMany collection cache is loaded', function() {
    beforeEach(function(done) {
      this.author.articleObjects.fetch().then(function() { done(); }, done);
    });

    it('caches the relevant belongsTo objects', function() {
      expect(this.author.articles.length).to.eql(1);
      expect(this.author.articles[0].author).to.equal(this.author);
    });

    describe('when storing existing object via belongsTo', function() {
      beforeEach(function() { this.article.author = this.author; });

      it('adds to hasMany collection cache', function() {
        expect(this.author.articles).to.contain(this.article);
      });

      describe('when executed', function() {
        beforeEach(function(done) {
          this.article.save().then(function() { done(); }, done);
        });

        it('executes the proper sql', function() {
          expect(adapter.executedSQL()).to.eql([
            // included from the fetch when loading the cache
            ['SELECT * FROM "articles" WHERE "author_id" = ?', [395]],
            // note that this expectation depends on ordering of object
            // properties which is not guaranteed to be a stable ordering.
            ['UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
             'WHERE "id" = ?', ['Dog Psychology', 395, 828]]
          ]);
        });
      });
    });

    describe('when removing existing object via belongsTo', function() {
      beforeEach(function() {
        this.article = this.author.articles[0];
        this.article.author = null;
      });

      it('removes from hasMany collection cache', function() {
        expect(this.author.articles).to.not.contain(this.article);
      });
    });

    describe('when changing existing object to new object via belongsTo', function() {
      beforeEach(function() {
        this.newAuthor = User.create({ username: 'reed' });
        this.article = this.author.articles[0];
        this.article.author = this.newAuthor;
      });

      it('removes from hasMany collection cache', function() {
        expect(this.author.articles).to.not.contain(this.article);
      });

      it('adds to hasMany collection cache', function() {
        expect(this.newAuthor.articles).to.contain(this.article);
      });
    });
  });

  describe('when storing existing object via belongsTo', function() {
    beforeEach(function() { this.article.author = this.author; });

    it('does not load hasMany collection cache', function() {
      expect(function() {
        this.author.articles;
      }.bind(this)).to.throw(/articles.*not yet.*loaded/i);
    });

    describe('when executed', function() {
      beforeEach(function(done) {
        this.article.save().then(function() { done(); }, done);
      });

      it('executes the proper sql', function() {
        expect(adapter.executedSQL()).to.eql([
          // note that this expectation depends on ordering of object
          // properties which is not guaranteed to be a stable ordering.
          ['UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
           'WHERE "id" = ?', ['Dog Psychology', 395, 828]]
        ]);
      });
    });
  });

  describe('when storing created object via belongsTo', function() {
    beforeEach(function() {
      this.author = User.create({ username: 'jack' });
      this.article.author = this.author;
    });

    it('adds to hasMany collection cache', function() {
      expect(this.author.articles).to.contain(this.article);
    });


    describe('when executed', function() {
      beforeEach(function(done) {
        this.article.save().then(function() { done(); }, done);
      });
    });
  });

  describe('when storing unsaved object via belongsTo', function() {
    beforeEach(function() {
      this.author.username = this.author.username + '_updated';
      this.article.author = this.author;
      // TODO: what happens when there is an error during the save? do in flight
      // values get reverted? do they get re-tried the next time around? consider
      // the following attributes when thinking about this:
      //   - article.author
      //   - article.authorId
      //   - article.attrs.author_id
      //   - this.author.articles << article
    });

    it('does not load hasMany collection cache', function() {
      expect(function() {
        this.author.articles;
      }.bind(this)).to.throw(/articles.*not yet.*loaded/i);
    });

    describe('when executed', function() {
      beforeEach(function(done) {
        this.article.save().then(function() { done(); }, done);
      });
    });
  });
});
