'use strict';

var expect = require('chai').expect;

var Statement = require('../../../lib/db/grammar/statement');
var Fragment = require('../../../lib/db/grammar/fragment');

describe('Fragment', function() {
  it('can be created with value and arguments', function() {
    var fragment = Fragment.create('value', ['argument']);
    expect(fragment.value).to.eql('value');
    expect(fragment.arguments).to.eql(['argument']);
  });

  it('can be created with an exiting fragment', function() {
    var existing = Fragment.create('string', ['args']);
    var recreate = Fragment.create(existing);
    expect(recreate.value).to.eql('string');
    expect(recreate.arguments).to.eql(['args']);
  });

  it('has a sql property', function() {
    var fragment = Fragment.create('sql test', []);
    expect(fragment.sql).to.eql('sql test');
  });
});

describe('Statement', function() {
  describe('when created from a fragment', function() {
    before(function() {
      this.statement = Statement.create(Fragment.create('hello ?', ['world']));
    });
    it('is the right type', function() {
      expect(this.statement).to.be.instanceof(Statement.__class__);
    });
    it('has the right value', function() {
      expect(this.statement.value).to.eql('hello ?');
    });
    it('has the right arguments', function() {
      expect(this.statement.arguments).to.eql(['world']);
    });
  });
});
