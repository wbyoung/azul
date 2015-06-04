'use strict';

require('./reset')();

var _ = require('lodash');
var chai = require('chai');
var util = require('util');


var BaseQuery = require('maguey').BaseQuery;
var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');
var Model = require('../../lib/model');

global.__db = function(fn) {
  var adapter = FakeAdapter.create({});
  var db = Database.create({ adapter: adapter });
  beforeEach(function() {
    db.init({ adapter: adapter }); // re-initialize
  });
  return function() {
    fn.call(this, db, adapter);
  };
};

Model.reopenClass({
  fresh: function() {
    return _.extend(this.create.apply(this, arguments), {
      _dirtyAttributes: {}
    });
  }
});

chai.use(require('sinon-chai'));

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
