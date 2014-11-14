'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../lib/db');
var FakeAdapter = require('./fakes/adapter');

var db,
  Article,
  User;

describe('Model', function() {
  before(function() {
    db = Database.create({ adapter: FakeAdapter.create({}) });
    Article = db.Model.extend({});
    Article.reopenClass({ __name__: 'Article' });
  });

  it('knows its table', function() {
    expect(Article.tableName()).to.eql('articles');
  });
});
