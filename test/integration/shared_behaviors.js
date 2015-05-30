'use strict';

var _ = require('lodash');
var util = require('util');
var expect = require('chai').expect;
var path = require('path');
var Promise = require('bluebird');
var Condition = require('../../lib/condition'),
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

shared.shouldSupportStandardTypes = function(it) {
  var db; before(function() { db = this.db; });

  // shared behavior for type tests
  var viaOptions = function(type, data, expected, options, equal, fn) {
    var table = util.format('azul_type_%s', type);
    var cast = function(result) {
      return this.castDatabaseValue(type, result, options);
    };
    equal = equal || 'equal';
    fn = fn || _.noop;
    return function(done) {
      Promise.bind(this)
      .then(function() {
        return db.schema.createTable(table).pk(null).with(function(table) {
          fn(table[type]('column', options));
        });
      })
      .then(function() { return db.insert(table, { column: data }); })
      .then(function() { return db.select(table); })
      .get('rows')
      .get('0')
      .get('column')
      .then(cast)
      .then(function(result) {
        expect(result).to[equal](expected);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    };
  };
  var via = function(type, data, equal) {
    return viaOptions(type, data, data, undefined, equal);
  };

  describe('types', function() {

    it('supports `auto.pk`',
      viaOptions('auto', 1, 1, { primaryKey: true }));
    it('supports `increments.pk`',
      viaOptions('increments', 1, 1, { primaryKey: true }));
    it('supports `serial.pk`',
      viaOptions('serial', 1, 1, { primaryKey: true }));
    it('supports `integer`', via('integer', 1));
    it('supports `integer64`', via('integer64', 1));
    it('supports `string`', via('string', 'hello world'));
    it('supports `text`', via('text', 'hello world'));
    it('supports `binary`', via('binary', new Buffer('hello world'), 'eql'));
    it('supports `bool`', via('bool', true));
    it('supports `date`', via('date', new Date(2014, 10-1, 31), 'eql'));
    it('supports `time`', via('time', '11:57:23'));
    it('supports `dateTime`', via('dateTime', new Date(2014, 10-1, 31), 'eql'));
    it('supports `float`', via('float', 3.14159));
    it('supports `decimal`', via('decimal', 3.14159));

    it('supports `string` length', viaOptions('string', 'val', 'val', {
      length: 3
    }));

    it('supports `decimal`', viaOptions('decimal', 3.14159, 3.14159));

    it('supports `decimal` precision', viaOptions('decimal', 3.14159, 3, {
      precision: 3
    }));

    it('supports `decimal` options', viaOptions('decimal', 3.14159, 3.14, {
      precision: 4,
      scale: 2
    }));

    it('supports `pk`', viaOptions('string', 'key', 'key', {}, null,
      function(col) { col.pk(); }));

    it('supports `primaryKey`', viaOptions('string', 'key', 'key', {}, null,
      function(col) { col.primaryKey(); }));

    it('supports `default`', function(done) {
      var table = 'azul_default';
      var value = 'azul\'s default\\\n\t\b\r\x1a"';
      Promise.bind(this)
      .then(function() {
        return db.schema.createTable(table).pk(null).with(function(table) {
          table.string('required');
          table.string('string').default(value);
          table.integer('integer').default(3);
        });
      })
      .then(function() { return db.insert(table, { required: '' }); })
      .then(function() { return db.select(table); })
      .get('rows')
      .get('0')
      .then(function(result) {
        expect(result).to.eql({ required: '', string: value, integer: 3 });
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });

    it('supports `notNull`', function(done) {
      var table = 'azul_not_null';
      Promise.bind(this)
      .then(function() {
        return db.schema.createTable(table).pk(null).with(function(table) {
          table.string('column').notNull();
        });
      })
      .then(function() { return db.insert(table, { column: null }); })
      .throw(new Error('Expected insert error to occur.'))
      .catch(function(e) {
        expect(e.message).to.match(/(cannot|violates|constraint).*null/i);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });

    it('supports `unique`', function(done) {
      var table = 'azul_unique';
      Promise.bind(this)
      .then(function() {
        return db.schema.createTable(table).pk(null).with(function(table) {
          table.string('column').unique();
        });
      })
      .then(function() { return db.insert(table, { column: 'val' }); })
      .then(function() { return db.insert(table, { column: 'val' }); })
      .throw(new Error('Expected insert error to occur.'))
      .catch(function(e) {
        expect(e.message).to.match(/duplicate|unique constraint/i);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });
  });
};

shared.shouldSupportTransactions = function(it) {
  var db; before(function() { db = this.db; });

  describe('transactions', function() {
    beforeEach(function(done) {
      db.schema.createTable('people').pk(null).with(function(table) {
        table.string('name');
      })
      .execute()
      .return()
      .then(done, done);
    });

    afterEach(function(done) {
      db.schema.dropTable('people').ifExists()
        .execute()
        .return()
        .then(done, done);
    });

    it('works when nested', function(done) {
      var transaction = db.transaction();
      var q = db.query.transaction(transaction);
      transaction.begin()
      .then(function() {
        return q.insert('people').values({ name: 'Susan' });
      })
      .then(function() { return transaction.begin(); })
      .then(function() {
        return q.insert('people').values({ name: 'Jake' });
      })
      .then(function() { return transaction.commit(); })
      .then(function() { return transaction.begin(); })
      .then(function() {
        return q.insert('people').values({ name: 'Brad' });
      })
      .then(function() { return transaction.rollback(); })
      .then(function() {
        return q.select('people').fetch();
      })
      .then(function(people) {
        expect(people).to.eql([{ name: 'Susan' }, { name: 'Jake' }]);
      })
      .then(function() { return transaction.commit(); })
      .catch(function(e) { return transaction.rollback().execute().throw(e); })
      .return()
      .then(done, done);
    });
  });
};

shared.shouldSupportStandardConditions = function(it) {
  var db; before(function() { db = this.db; });

  describe('conditions', function() {
    beforeEach(function(done) {
      db.schema.createTable('people').pk(null).with(function(table) {
        table.string('name');
        table.integer('height');
        table.dateTime('dob');
      })
      .then(function() {
        return db.insert('people')
          .values({ name: 'Brad' })
          .values({ name: 'Jim', height: 69, dob: new Date(1968, 2-1, 14) })
          .values({ name: 'Kristen', height: 65, dob: new Date(1982, 12-1, 20, 20, 31, 43) })
          .values({ name: 'Sarah', height: 64, dob: new Date(1991, 9-1, 1) })
          .values({ name: 'Tim', height: 72, dob: new Date(1958, 4-1, 14) });
      })
      .then(function() { done(); }, done);
    });

    afterEach(function(done) {
      db.schema.dropTable('people').ifExists()
        .then(function() { done(); }, done);
    });

    it('supports `exact`', function(done) {
      db.select('people').where(w({
        name$exact: 'Jim',
        height$exact: 69,
        dob$exact: new Date(1968, 2-1, 14)
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim']);
      })
      .then(done, done);
    });

    it('supports `iexact`', function(done) {
      db.select('people').where(w({
        name$iexact: 'kristen'
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `in`', function(done) {
      db.select('people').where(w({
        name$in: ['Sarah', 'Tim']
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Sarah', 'Tim']);
      })
      .then(done, done);
    });

    it('supports `gt`', function(done) {
      db.select('people').where(w({
        height$gt: 64,
        dob$gt: new Date(1968, 2-1, 14)
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `gte`', function(done) {
      db.select('people').where(w({
        height$gte: 69,
        dob$gte: new Date(1958, 4-1, 14)
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Tim']);
      })
      .then(done, done);
    });

    it('supports `lt`', function(done) {
      db.select('people').where(w({
        height$lt: 69,
        dob$lt: new Date(1991, 9-1, 1)
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `lte`', function(done) {
      db.select('people').where(w({
        height$lte: 69,
        dob$lte: new Date(1991, 9-1, 1)
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen', 'Sarah']);
      })
      .then(done, done);
    });

    it('supports `between` with numbers', function(done) {
      db.select('people').where(w({
        height$between: [65, 69]
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      })
      .then(done, done);
    });

    it('supports `between` with dates', function(done) {
      db.select('people').where(w({
        dob$between: [new Date(1968, 2-1, 14), new Date(1982, 12-1, 20, 20, 31, 43)]
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      })
      .then(done, done);
    });

    it('supports `isull`', function(done) {
      db.select('people').where(w({
        height$isnull: true,
        dob$isnull: true
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Brad']);
      })
      .then(done, done);
    });

    it('supports `contains` with uppercase value', function(done) {
      db.select('people').where(w({
        name$contains: 'T'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      })
      .then(done, done);
    });

    it('supports `contains` with lowercase value', function(done) {
      db.select('people').where(w({
        name$contains: 't'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `icontains`', function(done) {
      db.select('people').where(w({
        name$icontains: 'RA'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Brad', 'Sarah']);
      })
      .then(done, done);
    });

    it('supports `startsWith`', function(done) {
      db.select('people').where(w({
        name$startsWith: 'T'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      })
      .then(done, done);
    });

    it('supports `istartsWith`', function(done) {
      db.select('people').where(w({
        name$istartsWith: 'k'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `endsWith`', function(done) {
      db.select('people').where(w({
        name$endsWith: 'm'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Tim']);
      })
      .then(done, done);
    });

    it('supports `iendsWith`', function(done) {
      db.select('people').where(w({
        name$iendsWith: 'N'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `regex`', function(done) {
      db.select('people').where(w({
        name$regex: /Jim|Kristen/
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      })
      .then(done, done);
    });

    it('supports `iregex`', function(done) {
      db.select('people').where(w({
        name$iregex: /jim|kristen/i
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      })
      .then(done, done);
    });

    it('supports `year`', function(done) {
      db.select('people').where(w({
        dob$year: 1958
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      })
      .then(done, done);
    });

    it('supports `month`', function(done) {
      db.select('people').where(w({
        dob$month: 12
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `day`', function(done) {
      db.select('people').where(w({
        dob$day: 1
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Sarah']);
      })
      .then(done, done);
    });

    it('supports `weekday`', function(done) {
      db.select('people').where(w({
        dob$weekday: 'wed'
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim']);
      })
      .then(done, done);
    });

    it('supports `hour`', function(done) {
      db.select('people').where(w({
        dob$hour: 20
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `minute`', function(done) {
      db.select('people').where(w({
        dob$minute: 31
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `second`', function(done) {
      db.select('people').where(w({
        dob$second: 43
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
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
