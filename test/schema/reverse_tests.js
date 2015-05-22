'use strict';

var expect = require('chai').expect;

var _ = require('lodash');
var Database = require('../../lib/database');
var Schema = require('../../lib/schema');
var ReverseSchema = require('../../lib/schema/reverse');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/types/statement');

var db, adapter, schema;

describe('ReverseSchema', function() {
  before(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
    schema = db.schema.reverse();
  });

  it('cannot be created directly', function() {
    expect(function() {
      ReverseSchema.create();
    }).to.throw(/ReverseSchema must be spawned/i);
  });

  it('cannot generate sql', function() {
    expect(function() {
      schema.statement;
    }).to.throw(/must first call/i);
  });

  describe('#createTable', function() {

    it('reverses', function() {
      var query = schema.createTable('users', function(table) {
        table.string('name');
      });
      expect(query.statement).to.eql(Statement.create(
        'DROP TABLE "users"', []
      ));
    });

  });

  describe('#alterTable', function() {

    it('reverses', function() {
      var query = schema.alterTable('users', function(table) {
        table.string('name');
      });
      expect(query.statement).to.eql(Statement.create(
        'ALTER TABLE "users" DROP COLUMN "name"', []
      ));
    });

    it('reverses renaming a column', function() {
      var query = schema.alterTable('users', function(table) {
        table.rename('name', 'newname', 'string');
      });
      expect(query.statement).to.eql(Statement.create(
        'ALTER TABLE "users" RENAME "newname" TO "name"', []
      ));
    });

    it('reverses adding an index', function() {
      var query = schema.alterTable('users', function(table) {
        table.index(['first', 'last']);
      });
      expect(query.statement).to.eql(Statement.create(
        'DROP INDEX "users_first_last_idx"', []
      ));
    });

    it('reverses renaming an index', function() {
      var query = schema.alterTable('users', function(table) {
        table.renameIndex('a', 'b');
      });
      expect(query.statement).to.eql(Statement.create(
        'ALTER INDEX "b" RENAME TO "a"', []
      ));
    });

    it('is not reversible when columns are dropped', function() {
      expect(function() {
        schema.alterTable('users', function(table) {
          table.drop('name');
        }).sql;
      }).to.throw(/reverse.*cannot.*drop/i);
    });

    it('is not reversible when indexes are dropped', function() {
      expect(function() {
        schema.alterTable('users', function(table) {
          table.dropIndex('name');
        }).sql;
      }).to.throw(/reverse.*cannot.*drop/i);
    });

  });

  describe('#dropTable', function() {

    it('is not reversible', function() {
      expect(function() {
        schema.dropTable('users').sql;
      }).to.throw(/drop.*no reverse/i);
    });

  });

  describe('#renameTable', function() {

    it('reverses', function() {
      var query = schema.renameTable('users', 'accounts');
      expect(query.statement).to.eql(Statement.create(
        'ALTER TABLE "accounts" RENAME TO "users"', []
      ));
    });

  });

  it('overrides all schema methods', function() {
    var mixins = function(cls) {
      return _(cls.__identity__.__mixins__)
      .transform(function(array, mixin) { array.push(_.keys(mixin)); })
      .flatten().unique()
      .value();
    };
    var methods = function(cls) {
      return _(cls.__class__.prototype).map(function(value, name) {
        return _.isFunction(value) && name;
      })
      .filter()
      .value();
    };

    var defined = methods(ReverseSchema);
    var notOverridden = _(methods(Schema))
      .difference(mixins(Schema)) // ignore methods mixed in to schema
      .difference(defined) // remove any methods defined on reverse
      .difference(['reversible', 'reverse']) // whitelist
      .value();
    expect(notOverridden).to.eql([]);
  });
});
