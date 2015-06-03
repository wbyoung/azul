'use strict';

var _ = require('lodash');
var chai = require('chai');
var util = require('util');

// clear require cache of all maguey references. this is required to support
// mocha re-running the test suite in watch mode. mocha re-loads all of
// azul.js, and azul.js makes changes to certain classes in maguey. we need a
// fresh copy of the maguey classes so azul.js isn't adding changes on top of
// existing changes. do not require any modules before clearing the cache that
// would cause maguey to be loaded.
_.forEach(require.cache, function(value, key) {
  if (key.match(/\/maguey\//) && !key.match(/\/maguey\/node_modules\//)) {
    delete require.cache[key];
  }
});

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
