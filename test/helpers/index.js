'use strict';

require('./reset')();

var _ = require('lodash');
var sinon = require('sinon');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

var createAdapter = require('maguey-chai').adapter;
var EntryQuery = require('maguey').EntryQuery;
var Database = require('../..').Database;
var Model = require('../..').Model;

chaiAsPromised.transferPromiseness = function (assertion, promise) {
  assertion.then = promise.then.bind(promise);
  assertion.meanwhile = function(value) {
    var result = promise.return(value);
    return _.extend(result, { should: result.should.eventually });
  };
};

chai.use(require('sinon-chai'));
chai.use(require('maguey-chai'));
chai.use(require('azul-chai'));
chai.use(require('chai-also'));
chai.use(require('chai-properties'));
chai.use(require('chai-as-promised'));

global.expect = chai.expect;
global.should = chai.should();
global.sinon = sinon;

global.__adapter = function(fn) {
  return function() {
    beforeEach(function() {
      global.adapter = createAdapter();
    });
    fn.call(this);
  };
};

global.__query = function(fn) {
  return __adapter(function() {
    beforeEach(function() {
      global.query = EntryQuery.create(global.adapter);
    });
    fn.call(this);
  });
};

global.__db = function(fn) {
  return __adapter(function() {
    beforeEach(function() {
      global.db = Database.create({ adapter: global.adapter });
    });
    fn.call(this);
  });
};

Model.reopenClass({
  $: function() {
    return _.extend(this.create.apply(this, arguments), {
      _dirtyAttributes: {},
    });
  },
});

createAdapter().__identity__.reopen({

  /**
   * Respond specifically for select of migrations.
   *
   * @param {Array} names Names of migrations that will be used to build the
   * full result.
   */
  respondToMigrations: function(names) {
    var migrations = names.map(function(name, index) {
      return { id: index + 1, name: name, batch: 1 };
    });
    this.respond(/select.*from "azul_migrations"/i, migrations);
  },

});
