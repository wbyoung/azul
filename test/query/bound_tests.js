'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var BoundQuery = require('../../lib/query/bound');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/types/statement');
var property = require('corazon/property');

var db,
  adapter;

describe('BoundQuery', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      BoundQuery.create();
    }).to.throw(/BoundQuery must be spawned/i);
  });

  describe('when bound', function() {
    beforeEach(function() {
      this.query = this.boundQuery = db.query.bind(db.model('user', {
        name: db.attr(),
        organization: db.belongsTo(),
      }));
    });

    it('defaults to selecting data', function() {
      expect(this.query.statement).to.eql(Statement.create(
        'SELECT * FROM "users"', []
      ));
    });

    it('selects data', function() {
      var query = this.query.select();
      expect(query.statement).to.eql(Statement.create(
        'SELECT * FROM "users"', []
      ));
    });

    it('inserts data', function() {
      var query = this.query.insert({ name: 'Whitney' });
      expect(query.statement).to.eql(Statement.create(
        'INSERT INTO "users" ("name") VALUES (?)', ['Whitney']
      ));
    });

    it('updates data', function() {
      var query = this.query.update({ name: 'Whitney' });
      expect(query.statement).to.eql(Statement.create(
        'UPDATE "users" SET "name" = ?', ['Whitney']
      ));
    });

    it('deletes data', function() {
      var query = this.query.delete();
      expect(query.statement).to.eql(Statement.create(
        'DELETE FROM "users"', []
      ));
    });

    it('executes raw queries', function() {
      var query = this.query.raw('SELECT * FROM "users"');
      expect(query.statement).to.eql(Statement.create(
        'SELECT * FROM "users"', []
      ));
    });

    describe('with pre-specified condition', function() {
      beforeEach(function() {
        this.query = this.boundQuery.where({ name: 'Whitney' });
      });

      it('allows select', function() {
        expect(this.query.select().statement).to.eql(Statement.create(
          'SELECT * FROM "users" WHERE "name" = ?', ['Whitney']
        ));
      });

      it('allows update', function() {
        expect(this.query.update({ name: 'Whit' }).statement).to.eql(Statement.create(
          'UPDATE "users" SET "name" = ? WHERE "name" = ?', ['Whit', 'Whitney']
        ));
      });

      it('allows delete', function() {
        expect(this.query.delete().statement).to.eql(Statement.create(
          'DELETE FROM "users" WHERE "name" = ?', ['Whitney']
        ));
      });

      it('does not allow insert', function() {
        expect(function() {
          this.query.insert({ name: 'Whit' });
        }.bind(this)).to.throw(/cannot.*insert.*query.*where/i);
      });

      it('does not allow raw', function() {
        expect(function() {
          this.query.raw('SELECT * FROM "users"');
        }.bind(this)).to.throw(/cannot.*raw.*query.*where/i);
      });
    });

    describe('pre-specified order', function() {
      beforeEach(function() {
        this.query = this.boundQuery.orderBy('name');
      });

      it('does not allow insert', function() {
        expect(function() {
          this.query.insert({ name: 'Whit' });
        }.bind(this)).to.throw(/cannot.*insert.*query.*orderBy/i);
      });

      it('does not allow update', function() {
        expect(function() {
          this.query.update({ name: 'Whit' });
        }.bind(this)).to.throw(/cannot.*update.*query.*orderBy/i);
      });

      it('does not allow delete', function() {
        expect(function() {
          this.query.delete();
        }.bind(this)).to.throw(/cannot.*delete.*query.*orderBy/i);
      });

      it('does not allow raw', function() {
        expect(function() {
          this.query.raw('SELECT * FROM "users"');
        }.bind(this)).to.throw(/cannot.*raw.*query.*orderBy/i);
      });
    });

    describe('pre-specified limit', function() {
      beforeEach(function() {
        this.query = this.boundQuery.limit(3);
      });

      it('allows select', function() {
        expect(this.query.select().statement).to.eql(Statement.create(
          'SELECT * FROM "users" LIMIT 3', []
        ));
      });

      it('does not allow insert', function() {
        expect(function() {
          this.query.insert({ name: 'Whit' });
        }.bind(this)).to.throw(/cannot.*insert.*query.*limit/i);
      });

      it('does not allow update', function() {
        expect(function() {
          this.query.update({ name: 'Whit' });
        }.bind(this)).to.throw(/cannot.*update.*query.*limit/i);
      });

      it('does not allow delete', function() {
        expect(function() {
          this.query.delete();
        }.bind(this)).to.throw(/cannot.*delete.*query.*limit/i);
      });

      it('does not allow raw', function() {
        expect(function() {
          this.query.raw('SELECT * FROM "users"');
        }.bind(this)).to.throw(/cannot.*raw.*query.*limit/i);
      });
    });

    describe('pre-specified join', function() {
      beforeEach(function() {
        this.query = this.boundQuery
          .join('profiles', 'left', 'users.profile_id=profiles.id');
      });

      it('allows select', function() {
        expect(this.query.select().statement).to.eql(Statement.create(
          'SELECT "users".* FROM "users" LEFT JOIN "profiles" ' +
          'ON "users"."profile_id" = "profiles"."id"', []
        ));
      });

      it('allows select with specific args', function() {
        expect(this.query.select(['pk']).statement).to.eql(Statement.create(
          'SELECT "users"."id" FROM "users" LEFT JOIN "profiles" ' +
          'ON "users"."profile_id" = "profiles"."id"', []
        ));
      });

      it('allows join after unbind', function() {
        var query = this.query.unbind()
          .join('companies', 'left', 'users.company_id=companies.id')
          .select(['column']); // unbound query should not alter this column
        expect(query.statement).to.eql(Statement.create(
          'SELECT "column" FROM "users" ' +
          'LEFT JOIN "profiles" ' +
          'ON "users"."profile_id" = "profiles"."id" ' +
          'LEFT JOIN "companies" ' +
          'ON "users"."company_id" = "companies"."id"', []
        ));
      });

      it('does not allow insert', function() {
        expect(function() {
          this.query.insert({ name: 'Whit' });
        }.bind(this)).to.throw(/cannot.*insert.*query.*join/i);
      });

      it('does not allow update', function() {
        expect(function() {
          this.query.update({ name: 'Whit' });
        }.bind(this)).to.throw(/cannot.*update.*query.*join/i);
      });

      it('does not allow delete', function() {
        expect(function() {
          this.query.delete();
        }.bind(this)).to.throw(/cannot.*delete.*query.*join/i);
      });

      it('does not allow raw', function() {
        expect(function() {
          this.query.raw('SELECT * FROM "users"');
        }.bind(this)).to.throw(/cannot.*raw.*query.*join/i);
      });
    });

    it('allows relationship join', function() {
      var query = this.query.join('organization');
      expect(query.statement).to.eql(Statement.create(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "organizations" ' +
        'ON "users"."organization_id" = "organizations"."id"', []
      ));
    });

    it('allows relationship join after `select`', function() {
      var query = this.query.select(['pk']).join('organization');
      expect(query.statement).to.eql(Statement.create(
        'SELECT "users"."id" FROM "users" ' +
        'INNER JOIN "organizations" ' +
        'ON "users"."organization_id" = "organizations"."id"', []
      ));
    });

    it('allows relationship join after `all`', function() {
      var query = this.query.all().join('organization');
      expect(query.statement).to.eql(Statement.create(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "organizations" ' +
        'ON "users"."organization_id" = "organizations"."id"', []
      ));
    });

    it('allows relationship in where after `all`', function() {
      var Organization = db.model('organization');
      var organization = Organization.create({ id: 5 });
      var query = this.query.all().where({
        organization: organization
      });
      expect(query.statement).to.eql(Statement.create(
        'SELECT "users".* FROM "users" ' +
        'INNER JOIN "organizations" ' +
        'ON "users"."organization_id" = "organizations"."id" ' +
        'WHERE "organizations"."id" = ? ' +
        'GROUP BY "users"."id"', [5]
      ));
    });

    it('has a fetch method', function(done) {
      adapter.intercept(/select.*from "users"/i, {
        fields: ['id', 'title'],
        rows: [{ id: 1, title: '1' }]
      });
      this.query.fetch().then(function(rows) {
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

    it('gives a useful error when bad attr is used in `where`', function() {
      expect(function() {
        this.query.where({ invalidAttr: 'value' }).all();
      }.bind(this)).to.throw(/invalid field.*"invalidAttr".*user query.*user class/i);
    });

    it('gives a useful error when bad relation is used for `with`', function() {
      expect(function() {
        this.query.with('streets');
      }.bind(this)).to.throw(/no relation.*"streets".*with.*user query/i);
    });

    it('does not allow `with` on non-select queries', function() {
      expect(function() {
        this.query.with('organization').update();
      }.bind(this)).to.throw(/cannot perform.*update.*after.*with/i);
    });

    it('does not allow `with` when unbound', function() {
      expect(function() {
        this.query.unbind().with('organization');
      }.bind(this)).to.throw(/cannot perform.*with.*unbound/i);
    });

    it('does not allow `unique` on non-select queries', function() {
      expect(function() {
        this.query.unique().update();
      }.bind(this)).to.throw(/cannot perform.*update.*after.*groupBy/i);
    });

    it('does not allow `unique` when unbound', function() {
      expect(function() {
        this.query.unbind().unique();
      }.bind(this)).to.throw(/cannot perform.*unique.*unbound/i);
    });

    it('gives a useful error when bad relation is used for `join`', function() {
      expect(function() {
        this.query.join('streets');
      }.bind(this)).to.throw(/no relation.*"streets".*join.*user query/i);
    });

  });

  it('does not allow `with` on unbound queries', function() {
    expect(function() {
      db.select('users').with('author');
    }).to.throw(/cannot perform.*with.*unbound/i);
  });

  it('re-throws when auto-join is used and error is not expected', function() {
    var Model = db.model('article', {
      authorRelation: property(function() {
        throw new Error('test error');
      }),
    });
    expect(function() {
      db.query.bind(Model).where({ 'author.id': 7 }).statement.sql;
    }).to.throw(/test error/i);
  });

});
