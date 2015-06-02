'use strict';

var chai = require('chai');
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');
var BaseRelation = require('../../lib/relations/base');
var property = require('corazon/property');

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

  it('dispatches methods & properties to instance relation', function() {
    var method = sinon.spy();
    var getter = sinon.spy();
    var setter = sinon.spy();

    var Relation = BaseRelation.extend({
      method: method,
      get: getter,
      set: setter
    });
    Relation.reopenClass({
      methods: {
        '<singular>Method': BaseRelation.method('method'),
        '<singular>Property': BaseRelation.property('get', 'set'),
      }
    });

    // this is a strategy that azul-transaction uses, so we need to support it
    var Base = db.Model.extend({ custom: Relation.attr()() });
    var relation = Object.create(Base.__class__.prototype.customRelation);
    var Override = Base.extend({
      customRelation: property(function() { return relation; })
    });

    var base = Base.create();
    var override = Override.create();

    base.customMethod();
    override.customMethod(); // should be called with custom object
    base.customProperty;
    override.customProperty; // should be called with custom object
    base.customProperty = undefined;
    override.customProperty = undefined; // should be called with custom object

    expect(method.getCall(0).thisValue)
      .to.equal(Base.__class__.prototype.customRelation);
    expect(method.getCall(1).thisValue)
      .to.equal(relation);
    expect(method).to.have.been.calledTwice;
    expect(getter.getCall(0).thisValue)
      .to.equal(Base.__class__.prototype.customRelation);
    expect(getter.getCall(1).thisValue)
      .to.equal(relation);
    expect(getter).to.have.been.calledTwice;
    expect(setter.getCall(0).thisValue)
      .to.equal(Base.__class__.prototype.customRelation);
    expect(setter.getCall(1).thisValue)
      .to.equal(relation);
    expect(setter).to.have.been.calledTwice;
  });

});
