'use strict';

var expect = require('chai').expect;

var Grammar = require('../../lib/dialect/grammar');
var Statement = require('../../lib/types/statement');
var Fragment = require('../../lib/types/fragment');

describe('Fragment', function() {
  it('can be created with value and arguments', function() {
    var fragment = Fragment.create('value', ['argument']);
    expect(fragment.value).to.eql('value');
    expect(fragment.args).to.eql(['argument']);
  });

  it('can be created with an exiting fragment', function() {
    var existing = Fragment.create('string', ['args']);
    var recreate = Fragment.create(existing);
    expect(recreate.value).to.eql('string');
    expect(recreate.args).to.eql(['args']);
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
      expect(this.statement.args).to.eql(['world']);
    });
  });
});

describe('Grammar', function() {
  describe('an instance', function() {
    beforeEach(function() {
      this.grammar = Grammar.create({});
    });

    it('escapes strings', function() {
      expect(this.grammar.escape('example with \' character'))
        .to.eql('\'example with \'\' character\'');
    });

    it('does not escape numbers', function() {
      expect(this.grammar.escape(5)).to.eql(5);
    });

    it('does not support escaping objects', function() {
      expect(function() {
        this.grammar.escape({});
      }.bind(this)).to.throw(/cannot escape/i);
    });

    it('does not support escaping arrays', function() {
      expect(function() {
        this.grammar.escape([]);
      }.bind(this)).to.throw(/cannot escape/i);
    });
  });
});
