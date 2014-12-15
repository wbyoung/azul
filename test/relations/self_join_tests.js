'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');

require('../helpers/model');

var db,
  adapter,
  Employee;

describe('Model self-joins', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var hasMany = db.hasMany;
    var belongsTo = db.belongsTo;

    Employee = db.model('employee').reopen({
      subordinates: hasMany('employee', { inverse: 'manager' }),
      manager: belongsTo('employee', { inverse: 'subordinates' })
    });
  });

  it('generates the proper sql', function(done) {
    Employee.objects.where({ 'manager.id': 1 }).then(function(/*employee*/) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "employees" ' +
         'INNER JOIN "employees" "manager" ' +
         'ON "employees"."manager_id" = "manager"."id" ' +
         'WHERE "manager"."id" = ?', [1]]
      ]);
    })
    .done(done, done);
  });

  it('expands attributes', function(done) {
    Employee.objects.where({ 'manager.pk': 1 }).then(function(/*employee*/) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "employees" ' +
         'INNER JOIN "employees" "manager" ' +
         'ON "employees"."manager_id" = "manager"."id" ' +
         'WHERE "manager"."id" = ?', [1]]
      ]);
    })
    .done(done, done);
  });

});
