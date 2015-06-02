'use strict';

var chai = require('chai');
var expect = chai.expect;

var util = require('util');
var Node = require('../../lib/condition/node');
var Condition = require('../../lib/condition'),
  w = Condition.w,
  f = Condition.f,
  l = Condition.l;

var Grammar = require('../../lib/dialect/grammar');
var Translator = require('../../lib/dialect/translator');

describe('Condition', function() {
  beforeEach(function() {
    this.grammar = Grammar.extend({
      field: function(field) { return field; },
      value: function(value) {
        return util.format('%j', value);
      }
    }).create();
    this.translator = Translator.extend({}).create();
    this.stringify = function(condition) {
      return condition.build(this.grammar, this.translator).toString();
    };
  });

  describe('creation', function() {
    it('returns the given object if it\'s a condition', function() {
      var c = w({ id: 1 });
      expect(w(c)).to.equal(c);
    });

    it('requires an argument', function() {
      expect(function() { w(); }).to.throw(/condition required/i);
    });
  });

  it('must yield an expression when being constructed', function() {
    // the only way to test this is to override a private method
    var ConditionOverride = Condition.extend({
      _reduceBinary: function() { return []; }
    });
    expect(function() {
      ConditionOverride.create({});
    }).to.throw(/binary.*failed.*yield.*single expression/i);
  });

  it('requires expression left hand side to be a leaf', function() {
    // the only way to test this is to call a private method
    var c = w({});
    var lhs = Node.create('group', [], {});
    var rhs = Node.create('leaf', [], { value: 'value' });
    var expression = Node.create('expression', [lhs, rhs]);
    c._tree = Node.create('tree', [expression]);
    expect(function() {
      c.build(this.grammar, this.translator);
    }.bind(this)).to.throw(/left hand side.*must be.*leaf/i);
  });

  it('requires expression right hand side to be a leaf', function() {
    // the only way to test this is to call a private method
    var c = w({});
    var lhs = Node.create('leaf', [], { value: 'value' });
    var rhs = Node.create('group', [], {});
    var expression = Node.create('expression', [lhs, rhs]);
    c._tree = Node.create('tree', [expression]);
    expect(function() {
      c.build(this.grammar, this.translator);
    }.bind(this)).to.throw(/right hand side.*must be.*leaf/i);
  });

  it('can build expressions', function() {
    var result = this.stringify(w({ id: 1 }, { name: 'Whitney' }));
    expect(result).to.eql('id = 1 AND name = "Whitney"');
  });

  describe('fields', function() {
    it('defaults to values for the right-hand-side', function() {
      var result = this.stringify(w({ first: 'value' }));
      expect(result).to.eql('first = "value"');
    });

    it('accepts fields for the right-hand-side', function() {
      var result = this.stringify(w({ first: f('value') }));
      expect(result).to.eql('first = value');
    });

    it('converts a simple string to a condition using fields', function() {
      var result = this.stringify(w('first=value'));
      expect(result).to.eql('first = value');
    });
  });

  describe('literals', function() {
    it('accepts literals for the right-hand-side', function() {
      // use base grammar to ensure literal is handled differently from fields
      var grammar = Grammar.create();
      var condition = w({ first: l('value') });
      var result =  condition.build(grammar, this.translator).toString();
      expect(result).to.eql('"first" = value');
    });
  });

  describe('predicates', function() {
    it('extracts predicates', function() {
      var details = Condition._extractPredicate('id$gt');
      expect(details.key).to.eql('id');
      expect(details.predicate).to.equal('gt');
    });

    it('extracts predicates in alternative format', function() {
      var details = Condition._extractPredicate('id[gt]');
      expect(details.key).to.eql('id');
      expect(details.predicate).to.equal('gt');
    });

    it('extracts predicates with table names', function() {
      var details = Condition._extractPredicate('users.id$gt');
      expect(details.key).to.eql('users.id');
      expect(details.predicate).to.equal('gt');
    });

    it('defaults to exact', function() {
      var details = Condition._extractPredicate('address');
      expect(details.key).to.eql('address');
      expect(details.predicate).to.equal('exact');
    });

    it('supports exact', function() {
      var result = this.stringify(w({ name$exact: 'Whitney' }));
      expect(result).to.eql('name = "Whitney"');
    });

    it('supports iexact', function() {
      var result = this.stringify(w({ name$iexact: 'Whitney' }));
      expect(result).to.eql('UPPER(name) = UPPER("Whitney")');
    });

    it('supports contains', function() {
      var result = this.stringify(w({ name$contains: 'Whit' }));
      expect(result).to.eql('name LIKE "%Whit%"');
    });

    it('supports icontains', function() {
      var result = this.stringify(w({ name$icontains: 'Whit' }));
      expect(result).to.eql('UPPER(name) LIKE UPPER("%Whit%")');
    });

    var shouldBehaveLikeALikeQuery = function(pred) {
      it(util.format('supports %s with special characters', pred), function() {
        // all of the escapes here are hard to read...
        // the special characters in the condition are: %_\
        // the expected result are \%\_\\, but are converted to JSON, so they
        // end up as \\%\\_\\\\ & each one needs to be escaped in the regex, so
        // it becomes 4 backslashes, a percent sign, 4 backslashes, an
        // underscore, then 8 backslashes
        var query = {};
        query['name$' + pred] = '%_\\';
        var result = this.stringify(w(query));
        expect(result).to
          .match(/name.*LIKE.*\\\\%\\\\_\\\\\\\\/);
      });
    };

    ['contains', 'icontains', 'startswith', 'istartswith',
     'endswith', 'iendswith' ].forEach(shouldBehaveLikeALikeQuery);

    it('supports in', function() {
      var result = this.stringify(w({ name$in: ['Whit', 'Whitney'] }));
      expect(result).to.eql('name IN ("Whit", "Whitney")');
    });

    it('supports gt', function() {
      var result = this.stringify(w({ age$gt: 23 }));
      expect(result).to.eql('age > 23');
    });

    it('supports gte', function() {
      var result = this.stringify(w({ age$gte: 23 }));
      expect(result).to.eql('age >= 23');
    });

    it('supports lt', function() {
      var result = this.stringify(w({ age$lt: 23 }));
      expect(result).to.eql('age < 23');
    });

    it('supports lte', function() {
      var result = this.stringify(w({ age$lte: 23 }));
      expect(result).to.eql('age <= 23');
    });

    it('supports startswith', function() {
      var result = this.stringify(w({ name$startswith: 'Whit' }));
      expect(result).to.eql('name LIKE "Whit%"');
    });

    it('supports istartswith', function() {
      var result = this.stringify(w({ name$istartswith: 'Whit' }));
      expect(result).to.eql('UPPER(name) LIKE UPPER("Whit%")');
    });

    it('supports endswith', function() {
      var result = this.stringify(w({ name$endswith: 'Whit' }));
      expect(result).to.eql('name LIKE "%Whit"');
    });

    it('supports iendswith', function() {
      var result = this.stringify(w({ name$iendswith: 'Whit' }));
      expect(result).to.eql('UPPER(name) LIKE UPPER("%Whit")');
    });

    it('supports between', function() {
      var result = this.stringify(w({ age$between: [10, 20] }));
      expect(result).to.eql('age BETWEEN 10 AND 20');
    });

    it('supports between with objects', function() {
      var result = this.stringify(w({ age$between: ['start', 'end'] }));
      expect(result).to.eql('age BETWEEN "start" AND "end"');
    });

    it('supports between for dates', function() {
      var range = [
        new Date(Date.UTC(2014, 10-1, 23)),
        new Date(Date.UTC(2014, 10-1, 24))
      ];
      var result = this.stringify(w({ created$between: range }));
      var expected = 'created BETWEEN "2014-10-23T00:00:00.000Z" AND ' +
        '"2014-10-24T00:00:00.000Z"';
      expect(result).to.eql(expected);
    });

    it('supports year', function() {
      var result = this.stringify(w({ created$year: 2014 }));
      expect(result).to.eql('YEAR(created) = 2014');
    });

    it('supports month', function() {
      var result = this.stringify(w({ created$month: 10 }));
      expect(result).to.eql('MONTH(created) = 10');
    });

    it('supports day', function() {
      var result = this.stringify(w({ created$day: 23 }));
      expect(result).to.eql('DAY(created) = 23');
    });

    it('supports hour', function() {
      var result = this.stringify(w({ created$hour: 10 }));
      expect(result).to.eql('HOUR(created) = 10');
    });

    it('supports minute', function() {
      var result = this.stringify(w({ created$minute: 23 }));
      expect(result).to.eql('MINUTE(created) = 23');
    });

    it('supports second', function() {
      var result = this.stringify(w({ created$second: 49 }));
      expect(result).to.eql('SECOND(created) = 49');
    });

    it('supports weekday with sunday', function() {
      var result = this.stringify(w({ created$weekday: 'sunday' }));
      expect(result).to.eql('WEEKDAY(created) = 0');
    });

    it('supports isnull', function() {
      var result = this.stringify(w({ name$isnull: true }));
      expect(result).to.eql('name IS NULL');
    });

    it('supports negated isnull', function() {
      var result = this.stringify(w({ name$isnull: false }));
      expect(result).to.eql('name IS NOT NULL');
    });

    it('supports regex', function() {
      var result = this.stringify(w({ name$regex: /hello.*world/ }));
      expect(result).to.eql('name ~ "hello.*world"');
    });

    it('supports iregex', function() {
      var result = this.stringify(w({ name$iregex: /hello.*world/ }));
      expect(result).to.eql('name ~* "hello.*world"');
    });

    it('supports regex as string', function() {
      var result = this.stringify(w({ name$regex: '/hello.*world' }));
      expect(result).to.eql('name ~ "/hello.*world"');
    });

    it('supports iregex as string', function() {
      var result = this.stringify(w({ name$iregex: '/hello.*world' }));
      expect(result).to.eql('name ~* "/hello.*world"');
    });

    it('raises for unsupported predicates', function() {
      expect(function() {
        this.stringify(w({ name$badPredicate: 'world' }));
      }.bind(this)).to.throw(/unsupported predicate.*badPredicate/i);
    });
  });

  describe('operators', function() {
    it('implicitly adds an "and"  joining conditions', function() {
      var result = this.stringify(w({ first: 'Whitney' }, { last: 'Young' }));
      expect(result).to.eql('first = "Whitney" AND last = "Young"');
    });

    it('supports "and" joining conditions', function() {
      var condition = w({ first: 'Whitney' }, w.and, { last: 'Young' });
      var result = this.stringify(condition);
      expect(result).to.eql('first = "Whitney" AND last = "Young"');
    });

    it('supports "and" string joining conditions', function() {
      var condition = w({ first: 'Whitney' }, 'and', { last: 'Young' });
      var result = this.stringify(condition);
      expect(result).to.eql('first = "Whitney" AND last = "Young"');
    });

    it('supports "&&" string joining conditions', function() {
      var condition = w({ first: 'Whitney' }, '&&', { last: 'Young' });
      var result = this.stringify(condition);
      expect(result).to.eql('first = "Whitney" AND last = "Young"');
    });

    it('does not support "and" prefixing conditions', function() {
      expect(function() {
        w(w.and, { first: 'Whitney' });
      }.bind(this)).to.throw(/"and".*must include left hand/i);
    });

    it('does not support "and" without right hand', function() {
      expect(function() {
        w({ first: 'Whitney' }, w.and);
      }.bind(this)).to.throw(/"and".*must include right hand/i);
    });

    it('does not support "and" without an expression', function() {
      expect(function() { w(w.and); })
        .to.throw(/"and".*must include left hand/i);
    });

    it('supports "or" joining conditions', function() {
      var condition = w({ first: 'Whitney' }, w.or, { first: 'Whit' });
      var result = this.stringify(condition);
      expect(result).to.eql('first = "Whitney" OR first = "Whit"');
    });

    it('supports "or" string joining conditions', function() {
      var condition = w({ first: 'Whitney' }, 'or', { first: 'Whit' });
      var result = this.stringify(condition);
      expect(result).to.eql('first = "Whitney" OR first = "Whit"');
    });

    it('supports "||" string joining conditions', function() {
      var condition = w({ first: 'Whitney' }, '||', { first: 'Whit' });
      var result = this.stringify(condition);
      expect(result).to.eql('first = "Whitney" OR first = "Whit"');
    });

    it('does not support "or" prefixing conditions', function() {
      expect(function() {
        w(w.or, { first: 'Whitney' });
      }.bind(this)).to.throw(/"or".*must include left hand/i);
    });

    it('does not support "or" without an expression', function() {
      expect(function() { w(w.or); })
        .to.throw(/"or".*must include left hand/i);
    });

    it('does not support "or" without right hand', function() {
      expect(function() {
        w({ first: 'Whitney' }, w.or);
      }.bind(this)).to.throw(/"or".*must include right hand/i);
    });

    it('requires explicit binary operation when "not" is between conditions', function() {
      expect(function() {
        w({ first: 'Whitney' }, w.not, { first: 'Whit' });
      }.bind(this)).to.throw(/"not".*between expressions/);
    });

    it('supports "not" prefixing conditions', function() {
      var result = this.stringify(w(w.not, { first: 'Whitney' }));
      expect(result).to.eql('NOT first = "Whitney"');
    });

    it('supports "not" string prefixing conditions', function() {
      var result = this.stringify(w('not', { first: 'Whitney' }));
      expect(result).to.eql('NOT first = "Whitney"');
    });

    it('supports "!" string prefixing conditions', function() {
      var result = this.stringify(w('!', { first: 'Whitney' }));
      expect(result).to.eql('NOT first = "Whitney"');
    });

    it('does not support "not" followed by "and"', function() {
      expect(function() {
        w({ first: 'Whitney' }, w.or, w.not, w.and, { first: 'Whit' });
      }.bind(this)).to.throw(/"and".*cannot follow.*"not"/);
    });

    it('does not support "not" without an expression', function() {
      expect(function() { w(w.not); })
        .to.throw(/"not".*must precede expression/);
    });

    it('does not support multiple binary operators in a row', function() {
      expect(function() {
        w({ first: 'Whitney' }, w.and, w.or, { first: 'Whit' });
      }.bind(this)).to.throw(/"or".*invalid after.*"and"/);
    });

    it('does supports multiple unary operators in a row', function() {
      var result = this.stringify(w(w.not, w.not, { first: 'Whitney' }));
      expect(result).to.eql('NOT NOT first = "Whitney"');
    });
  });

  describe('sub-conditions', function() {
    it('builds complex expressions', function() {
      var firstPredicate = w({ first: 'Whit' }, w.or, { first: 'Whitney' });
      var lastPredicate = { last: 'Young' };
      var fullPredicate = w(firstPredicate, w.and, lastPredicate);
      var result = this.stringify(fullPredicate);
      expect(result).to.eql('(first = "Whit" OR first = "Whitney") AND last = "Young"');
    });

    it('allows arrays to form groupings', function() {
      var firstPredicate = [{ first: 'Whit' }, w.or, { first: 'Whitney' }];
      var lastPredicate = { last: 'Young' };
      var fullPredicate = w(firstPredicate, w.and, lastPredicate);
      var result = this.stringify(fullPredicate);
      expect(result).to.eql('(first = "Whit" OR first = "Whitney") AND last = "Young"');
    });

    it('handles neighboring conditions', function() {
      var predicate = w(w({ first: 'Whitney' }), w({ last: 'Young' }));
      var result = this.stringify(predicate);
      expect(result).to.eql('(first = "Whitney") AND (last = "Young")');
    });
  });

  describe('syntax builder', function() {
    var reduceToString = function(node, children) {
      var str = node.type;
      if (node.attrs.operator) {
        str = util.format('%s=%s', str, node.attrs.operator);
      }
      if (node.attrs.predicate) {
        str = util.format('%s=%s', str, node.attrs.predicate);
      }
      if (node.attrs.value) {
        str = util.format('%s=%s', str, node.attrs.value);
      }
      if (children.length) {
        str = util.format('<%s %s>', str, children.join(', '));
      }
      return str;
    };

    it('properly groups binary operators', function() {
      var c = w({ id: 1 }, w.and, { id: 2 });
      var s = c._tree.reduce(reduceToString);
      expect(s).to.eql('<tree <binaryOperation=and ' +
        '<expression=exact leaf=id, leaf=1>, ' +
        '<expression=exact leaf=id, leaf=2>>>');
    });

    it('properly groups binary operators', function() {
      var c = w({ id: 1 }, w.and, { id: 2 }, w.and, { id: 3 });
      var s = c._tree.reduce(reduceToString);
      expect(s).to.eql('<tree <binaryOperation=and ' +
        '<binaryOperation=and ' +
        '<expression=exact leaf=id, leaf=1>, ' +
        '<expression=exact leaf=id, leaf=2>>, ' +
        '<expression=exact leaf=id, leaf=3>>>');
    });

    it('properly groups unary and binary operators', function() {
      var c = w(w.not, w.not, { id: 1 }, { id: 2 });
      var s = c._tree.reduce(reduceToString);
      expect(s).to.eql('<tree <binaryOperation=and ' +
        '<unaryOperation=not <unaryOperation=not ' +
        '<expression=exact leaf=id, leaf=1>>>, ' +
        '<expression=exact leaf=id, leaf=2>>>');
    });
  });
});
