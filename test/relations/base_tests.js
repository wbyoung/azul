'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');
var BaseRelation = require('../../lib/relations/base');

require('../helpers/model');

var db,
  adapter,
  User;

describe('BaseRelation', function() {

  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
    User = db.model('user').reopen({ username: db.attr() });
  });

  it('requires subclass to implement associate', function() {
    var user1 = User.create();
    var user2 = User.create();
    var relation = BaseRelation.create('article', { context: User });
    expect(function() {
      relation.associate(user1, user2);
    }).to.throw(/associate.*must.*implemented.*subclass/i);
  });

  it('requires subclass to implement disassociate', function() {
    var user1 = User.create();
    var user2 = User.create();
    var relation = BaseRelation.create('article', { context: User });
    expect(function() {
      relation.disassociate(user1, user2);
    }).to.throw(/disassociate.*must.*implemented.*subclass/i);
  });

  it('requires subclass to implement prefetch', function() {
    var user1 = User.create();
    var user2 = User.create();
    var relation = BaseRelation.create('article', { context: User });
    expect(function() {
      relation.prefetch(user1, user2);
    }).to.throw(/prefetch.*must.*implemented.*subclass/i);
  });

  it('requires subclass to implement associatePrefetchResults', function() {
    var user1 = User.create();
    var user2 = User.create();
    var relation = BaseRelation.create('article', { context: User });
    expect(function() {
      relation.associatePrefetchResults(user1, user2);
    }).to.throw(/associatePrefetchResults.*must.*implemented.*subclass/i);
  });

});
