'use strict';

var _ = require('lodash');
var util = require('util');
var expect = require('chai').expect;
var path = require('path');
var Promise = require('bluebird');
var Condition = require('maguey').Condition,
  w = Condition.w;

require('../helpers/model');

var shared = {};

shared.shouldRunMigrationsAndQueries = function(it) {
  var db; before(function() { db = this.db; });

  describe('with migrations applied', function() {
    before(function(done) {
      var migration =
        path.join(__dirname, '../fixtures/migrations/blog');
      this.migrator = db.migrator(migration);
      this.migrator.migrate().then(function() { done(); }, done);
    });

    after(function(done) {
      this.migrator.rollback().then(function() { done(); }, done);
    });

    afterEach(function(done) {
      this.resetSequence('articles').then(function() { done(); }, done);
    });

    it('can insert, update, and delete data', function(done) {
      Promise.bind({})
      .then(function() {
        return db
          .insert('articles', { title: 'Title 1', body: 'Contents 1'});
      }).get('rows').get('0')
      .then(function(article) { expect(article).to.not.exist; })
      .then(function() {
        return db
          .insert('articles', { title: 'Title 2', body: 'Contents 2'})
          .returning('id');
      }).get('rows').get('0')
      .then(function(details) { expect(details).to.eql({ id: 2 }); })
      .then(function() { return db.select('articles'); }).get('rows')
      .then(function(articles) {
        expect(_.sortBy(articles, 'id')).to.eql([
          { id: 1, title: 'Title 1', body: 'Contents 1'},
          { id: 2, title: 'Title 2', body: 'Contents 2'}
        ]);
      })
      .then(function() {
        return db.update('articles', { title: 'Updated' }).where({ id: 1 });
      })
      .then(function() { return db.select('articles'); }).get('rows')
      .then(function(articles) {
        expect(_.sortBy(articles, 'id')).to.eql([
          { id: 1, title: 'Updated', body: 'Contents 1'},
          { id: 2, title: 'Title 2', body: 'Contents 2'}
        ]);
      })
      .then(function() { return db.delete('articles'); })
      .then(function() { return db.select('articles'); }).get('rows')
      .then(function(articles) {
        expect(articles).to.eql([]);
      })
      .done(done, done);
    });

    it('can create, update, read, and delete models', function(done) {

      var Article = db.model('article').reopen({
        title: db.attr(),
        body: db.attr(),
        comments: db.hasMany()
      });

      var Comment = db.model('comment').reopen({
        pk: db.attr('identifier'),
        identifier: db.attr('identifier'),
        email: db.attr(),
        body: db.attr(),
        article: db.belongsTo()
      });

      Promise.bind({})
      .then(function() {
        this.article1 = Article.create({ title: 'News', body: 'Azul 1.0' });
        return this.article1.save();
      })
      .then(function() {
        this.article2 = Article.create({ title: 'Update', body: 'Azul 2.0' });
        return this.article2.save();
      })
      .then(function() {
        this.comment1 = this.article1.createComment({
          email: 'info@azuljs.com', body: 'Sweet initial release.'
        });
        return this.comment1.save();
      })
      .then(function() {
        this.comment2 = this.article1.createComment({
          email: 'person@azuljs.com', body: 'Great initial release!'
        });
        return this.comment2.save();
      })
      .then(function() {
        this.comment3 = this.article2.createComment({
          email: 'another@azuljs.com', body: 'Good update.'
        });
        return this.comment3.save();
      })
      .then(function() {
        this.comment4 = this.article2.createComment({
          email: 'spam@azuljs.com', body: 'Rolex watches.'
        });
        return this.comment4.save();
      })
      .then(function() { return Article.objects.fetch(); })
      .then(function(articles) {
        expect(_.map(articles, 'attrs')).to.eql([
          { id: 1, title: 'News', body: 'Azul 1.0' },
          { id: 2, title: 'Update', body: 'Azul 2.0' },
        ]);
      })
      .then(function() {
        return Article.objects.where({ 'comments.body$icontains': 'rolex' });
      })
      .then(function(articles) {
        expect(_.map(articles, 'attrs')).to.eql([
          { id: 2, title: 'Update', body: 'Azul 2.0' },
        ]);
      })
      .then(function() {
        return Article.objects
          .where({ 'comments.body$icontains': 'initial' });
      })
      .then(function(articles) {
        expect(_.map(articles, 'attrs')).to.eql([
          { id: 1, title: 'News', body: 'Azul 1.0' },
        ]);
      })
      .then(function() {
        // with join first, automatic joining will not occur, so duplicate
        // results will be returned
        return Article.objects.join('comments')
          .where({ 'comments.body$icontains': 'initial' });
      })
      .then(function(articles) {
        expect(_.map(articles, 'attrs')).to.eql([
          { id: 1, title: 'News', body: 'Azul 1.0' },
          { id: 1, title: 'News', body: 'Azul 1.0' },
        ]);
      })
      .then(function() {
        return Comment.objects.where({ 'article.title': 'News' });
      })
      .then(function(comments) {
        expect(_.map(comments, 'attrs')).to.eql([
          { identifier: 1, 'article_id': 1,
            email: 'info@azuljs.com', body: 'Sweet initial release.' },
          { identifier: 2, 'article_id': 1,
            email: 'person@azuljs.com', body: 'Great initial release!' }
        ]);
      })
      .then(done, done);

    });

    it('cannot violate foreign key constraint', function(done) {
      db.insert('comments', { 'article_id': 923 }).execute()
      .throw(new Error(''))
      .catch(function(e) {
        expect(e.message).to.match(/constraint/i);
      })
      .then(done, done);
    });

  });
};

module.exports = function(options) {
  var opts = options || {};
  var skip = opts.skip;
  var replacementIt = function(description) {
    var args = _.toArray(arguments);
    if (skip && description && description.match(skip)) {
      args.splice(1);
    }
    it.apply(this, args);
  };
  _.extend(replacementIt, it);

  return _.mapValues(shared, function(fn) {
    return _.partial(fn, replacementIt);
  });
};
