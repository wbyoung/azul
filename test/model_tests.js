'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../lib/db');
var FakeAdapter = require('./fakes/adapter');
var Statement = require('../lib/db/grammar/statement');

var db,
  Article,
  User;

describe('Model', function() {
  before(function() {
    db = Database.create({ adapter: FakeAdapter.create({}) });
    Article = db.Model.extend({});
    Article.reopenClass({ __name__: 'Article' });

    User = db.Model.extend({});
    User.reopenClass({ __name__: 'User' });
  });

  it('knows its table', function() {
    expect(Article.tableName()).to.eql('articles');
  });

  it('can get objects', function() {
    expect(Article.objects.sql()).to.eql(Statement.create(
      'SELECT * FROM "articles"', []
    ));
  });
});
