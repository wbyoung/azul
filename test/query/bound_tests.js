'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var BoundQuery = require('../../lib/query/bound');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/grammar/statement');

var db,
  adapter;

describe('BoundQuery', function() {
  before(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      BoundQuery.create();
    }).to.throw(/BoundQuery must be spawned/i);
  });

  it('defaults to selecting data', function() {
    var query = db.query.bindTable('users');
    expect(query.statement).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  it('selects data', function() {
    var query = db.query.bindTable('users').select();
    expect(query.statement).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  it('inserts data', function() {
    var query = db.query.bindTable('users').insert({ name: 'Whitney' });
    expect(query.statement).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?)', ['Whitney']
    ));
  });

  it('updates data', function() {
    var query = db.query.bindTable('users').update({ name: 'Whitney' });
    expect(query.statement).to.eql(Statement.create(
      'UPDATE "users" SET "name" = ?', ['Whitney']
    ));
  });

  it('deletes data', function() {
    var query = db.query.bindTable('users').delete();
    expect(query.statement).to.eql(Statement.create(
      'DELETE FROM "users"', []
    ));
  });

  it('executes raw queries', function() {
    var query = db.query.bindTable('users').raw('SELECT * FROM "users"');
    expect(query.statement).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  describe('pre-specified condition', function() {
    var query;
    before(function() {
      query = db.query.bindTable('users').where({ name: 'Whitney' });
    });

    it('allows select', function() {
      expect(query.select().statement).to.eql(Statement.create(
        'SELECT * FROM "users" WHERE "name" = ?', ['Whitney']
      ));
    });

    it('allows update', function() {
      expect(query.update({ name: 'Whit' }).statement).to.eql(Statement.create(
        'UPDATE "users" SET "name" = ? WHERE "name" = ?', ['Whit', 'Whitney']
      ));
    });

    it('allows delete', function() {
      expect(query.delete().statement).to.eql(Statement.create(
        'DELETE FROM "users" WHERE "name" = ?', ['Whitney']
      ));
    });

    it('does not allow insert', function() {
      expect(function() {
        query.insert({ name: 'Whit' });
      }).to.throw(/cannot.*insert.*query.*where/i);
    });

    it('does not allow raw', function() {
      expect(function() {
        query.raw('SELECT * FROM "users"');
      }).to.throw(/cannot.*raw.*query.*where/i);
    });
  });

  describe('pre-specified order', function() {
    var query;
    before(function() {
      query = db.query.bindTable('users').orderBy('name');
    });

    it('does not allow insert', function() {
      expect(function() {
        query.insert({ name: 'Whit' });
      }).to.throw(/cannot.*insert.*query.*orderBy/i);
    });

    it('does not allow update', function() {
      expect(function() {
        query.update({ name: 'Whit' });
      }).to.throw(/cannot.*update.*query.*orderBy/i);
    });

    it('does not allow delete', function() {
      expect(function() {
        query.delete();
      }).to.throw(/cannot.*delete.*query.*orderBy/i);
    });

    it('does not allow raw', function() {
      expect(function() {
        query.raw('SELECT * FROM "users"');
      }).to.throw(/cannot.*raw.*query.*orderBy/i);
    });
  });

  describe('pre-specified limit', function() {
    var query;
    before(function() {
      query = db.query.bindTable('users').limit(3);
    });

    it('allows select', function() {
      expect(query.select().statement).to.eql(Statement.create(
        'SELECT * FROM "users" LIMIT 3', []
      ));
    });

    it('does not allow insert', function() {
      expect(function() {
        query.insert({ name: 'Whit' });
      }).to.throw(/cannot.*insert.*query.*limit/i);
    });

    it('does not allow update', function() {
      expect(function() {
        query.update({ name: 'Whit' });
      }).to.throw(/cannot.*update.*query.*limit/i);
    });

    it('does not allow delete', function() {
      expect(function() {
        query.delete();
      }).to.throw(/cannot.*delete.*query.*limit/i);
    });

    it('does not allow raw', function() {
      expect(function() {
        query.raw('SELECT * FROM "users"');
      }).to.throw(/cannot.*raw.*query.*limit/i);
    });
  });

  describe('pre-specified join', function() {
    var query;
    before(function() {
      query = db.query.bindTable('users')
        .join('profiles', 'left', 'users.profile_id=profiles.id');
    });

    it('allows select', function() {
      expect(query.select().statement).to.eql(Statement.create(
        'SELECT * FROM "users" LEFT JOIN "profiles" ' +
        'ON "users"."profile_id" = "profiles"."id"', []
      ));
    });

    it('does not allow insert', function() {
      expect(function() {
        query.insert({ name: 'Whit' });
      }).to.throw(/cannot.*insert.*query.*join/i);
    });

    it('does not allow update', function() {
      expect(function() {
        query.update({ name: 'Whit' });
      }).to.throw(/cannot.*update.*query.*join/i);
    });

    it('does not allow delete', function() {
      expect(function() {
        query.delete();
      }).to.throw(/cannot.*delete.*query.*join/i);
    });

    it('does not allow raw', function() {
      expect(function() {
        query.raw('SELECT * FROM "users"');
      }).to.throw(/cannot.*raw.*query.*join/i);
    });
  });

  it('has a fetch method', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: '1' }]
    });
    db.query.bindTable('users').fetch().then(function(rows) {
      expect(rows).to.eql([{ id: 1, title: '1' }]);
    })
    .then(done, done);
  });

  it('has a fetchOne method', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: '1' }]
    });
    db.select('users').fetchOne().then(function(result) {
      expect(result).to.eql({ id: 1, title: '1' });
    })
    .then(done, done);
  });
});
