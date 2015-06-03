'use strict';

var chai = require('chai');
var util = require('util');

var BaseQuery = require('maguey').BaseQuery;
var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');

exports.withDatabase = function(fn) {
  var adapter = FakeAdapter.create({});
  var db = Database.create({ adapter: adapter });
  return function() {
    fn.call(this, db, adapter);
  };
};

chai.use(function (_chai, _) {
  var Assertion = _chai.Assertion;
  Assertion.addMethod('query', function(sql, args) {
    var obj = this._obj;
    new Assertion(this._obj).to.be.instanceof(BaseQuery.__class__);
    var pass =
      _.eql(obj.sql, sql) &&
      _.eql(obj.args, args || []);
    var fmt = function(s, a) {
      return util.format('%s ~[%s]', s, a.join(', '));
    };
    this.assert(pass,
      'expected #{this} to have SQL #{exp} but got #{act}',
      'expected #{this} to not have SQL of #{act}',
      fmt(sql, args || []), fmt(obj.sql, obj.args));
  });
});
