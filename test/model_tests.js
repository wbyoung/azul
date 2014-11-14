'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../lib/db');
var FakeAdapter = require('./fakes/adapter');
var Statement = require('../lib/db/grammar/statement');

var db,
  adapter,
  Article,
  User;

describe('Model', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
    Article = db.Model.extend({});
    Article.reopenClass({ __name__: 'Article' });

    User = db.Model.extend({});
    User.reopenClass({ __name__: 'User' });

    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: 'Existing Article' }]
    });
  });

  it('knows its table', function() {
    expect(Article.tableName()).to.eql('articles');
  });

  it('can get objects', function(done) {
    Article.objects.fetch().then(function(articles) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles"', []]
      ]);
      expect(articles).to.eql([Article.create({ id: 1, title: 'Existing Article' })]);
    })
    .done(done, done);
  });

  it.skip('can create objects', function() {
    var article = Article.create({ title: 'Azul News' });
    expect(article.save().sql()).to.eql(Statement.create(
      'INSERT INTO "articles" ("title") VALUES (?)', ['Azul News']
    ));
  });
});
