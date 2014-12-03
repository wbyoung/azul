'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');

require('../helpers/model');

var db,
  adapter,
  Article,
  User,
  user,
  article,
  articleObjects;

var createdArticle;
var createdAuthor;
var storedAuthor;
var shared = {};

shared.storeExistingAuthor = function(done) {
  storedAuthor = User.fresh({ id: 5, username: 'jack' });
  var promise = article.storeAuthor(storedAuthor);

  // TODO: see comments below about expectations here
  // expect(article.authorId).to.not.exist;
  // expect(article.author).to.not.exist;

  promise.then(function() {
    // TODO: see comments below about expectations here
    // expect(article.authorId).to.eql(storedAuthor.id);
    // expect(article.author).to.equal(storedAuthor);
  })
  .done(done, done);
};

shared.storeUnsavedAuthor = function(done) {
  storedAuthor = User.create({ username: 'jack' });
  article.author = storedAuthor;
  var promise = article.save();

  // TODO: when do we want the following values to be set altered? before
  // or after the save of the article?
  //   - article.author
  //   - article.authorId
  //   - article.attrs.author_id
  //   - storedAuthor.articles << article
  // TODO: what happens when there is an error during the save? do the
  // values get reverted?
  // these are set after the promise is executed
  // expect(article.authorId).to.not.exist;
  // expect(article.author).to.not.exist;

  promise.then(function() {
    // TODO: see above
    // expect(article.authorId).to.eql(storedAuthor.id);
    // expect(article.author).to.equal(storedAuthor);
  })
  .done(done, done);
};

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
    user = User.fresh({ id: 1 });
    article = Article.fresh({ id: 1 });
    articleObjects = user.articleObjects;
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
      createdAuthor = article.createAuthor({ username: 'phil' });
    });

    it.skip('creates hasMany collection cache', function() {
      expect(createdAuthor.articles).to.eql([article]);
    });
  });

  describe('when creating via hasMany', function() {
    beforeEach(function() {
      createdArticle = user.createArticle({ title: 'Hello' });
    });

    it('creates an object of the correct type', function() {
      expect(createdArticle).to.to.be.an.instanceOf(Article.__class__);
    });

    it('sets inverse/belongsTo attribute', function() {
      expect(createdArticle.author).to.equal(user);
    });

  });

  describe('when adding existing object via hasMany', function() {
    beforeEach(function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      var promise = user.addArticle(article);

      // TODO: determine exactly how we want this to work & then add assertions
      // these are set after the promise is executed
      // expect(article.authorKey).to.not.exist;
      // expect(article.author).to.not.exist;

      promise.then(function() {
        // TODO: see above
        // expect(article.authorKey).to.eql(user.id);
        // expect(article.author).to.equal(user);
      })
      .done(done, done);
    });

    it('works', function() {

    });
  });

  describe('when removing existing object via hasMany', function() {
    beforeEach(function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      article.authorId = user.id;
      article.author = user;
      var promise = user.removeArticle(article);

      // TODO: determine exactly how we want this to work & then add assertions
      // these are set after the promise is executed
      // expect(article.authorKey).to.exist;
      // expect(article.author).to.exist;

      promise.then(function() {
        // TODO: see above
        // expect(article.authorKey).to.not.exist;
        // expect(article.author).to.not.exist;
      })
      .done(done, done);
    });

    it.skip('works', function() {

    });
  });

  describe('when hasMany collection cache is loaded', function() {
    beforeEach(function(done) {
      user.articleObjects.fetch().then(function() { done(); }, done);
    });

    describe('when storing existing object via belongsTo', function() {
      beforeEach(shared.storeExistingAuthor);

      it.skip('adds to hasMany collection cache', function() {
        expect(storedAuthor.articles).to.contain(article);
      });
    });

    describe('when storing unsaved object via belongsTo', function() {
      beforeEach(shared.storeUnsavedAuthor);

      it.skip('adds to hasMany collection cache', function() {
        expect(storedAuthor.articles).to.contain(article);
      });
    });
  });

  describe('when hasMany collection cache is not loaded', function() {
    describe('when storing existing object via belongsTo', function() {
      beforeEach(shared.storeExistingAuthor);

      it.skip('does not load hasMany collection cache', function() {
        expect(function() {
          user.articles;
        }).to.throw(/articles.*not yet.*loaded/i);
      });
    });

    describe('when storing unsaved object via belongsTo', function() {
      beforeEach(shared.storeUnsavedAuthor);

      it('does not load hasMany collection cache', function() {
        expect(function() {
          user.articles;
        }).to.throw(/articles.*not yet.*loaded/i);
      });
    });
  });
});
