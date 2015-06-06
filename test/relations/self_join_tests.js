'use strict';

require('../helpers');

var Database = require('../../lib/database');

var Employee,
  Node;

describe('Model self-joins', __db(function() {
  /* global db:true, adapter */

  beforeEach(function() {
    var hasMany = db.hasMany;
    var belongsTo = db.belongsTo;

    Employee = db.model('employee').reopen({
      subordinates: hasMany('employee', { inverse: 'manager' }),
      manager: belongsTo('employee', { inverse: 'subordinates' })
    });

    Node = db.model('node').reopen({
      parent: belongsTo('node', { inverse: 'nodes' }),
      nodes: hasMany('node', { inverse: 'parent' })
    });
  });

  describe('belongsTo', function() {
    it('generates the proper sql', function() {
      return Employee.objects.join('manager').where({ id: 1 }).should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "employees".* FROM "employees" ' +
           'INNER JOIN "employees" "manager" ' +
           'ON "employees"."manager_id" = "manager"."id" ' +
           'WHERE "employees"."id" = ?', [1]);
    });

    it('uses the correct table when where uses relation', function() {
      return Employee.objects.where({ 'manager.id': 1 }).should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "employees".* FROM "employees" ' +
           'INNER JOIN "employees" "manager" ' +
           'ON "employees"."manager_id" = "manager"."id" ' +
           'WHERE "manager"."id" = ? ' +
           'GROUP BY "employees"."id"', [1]);
    });

    it('expands attributes', function() {
      return Employee.objects.where({ 'manager.pk': 1 }).should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "employees".* FROM "employees" ' +
           'INNER JOIN "employees" "manager" ' +
           'ON "employees"."manager_id" = "manager"."id" ' +
           'WHERE "manager"."id" = ? ' +
           'GROUP BY "employees"."id"', [1]);
    });

    it('allows use of relation objects in complex query', function() {
      // anyone who reports to a 'jane' and where their manager is also just
      // under the ceo (but not those named 'jane' who don't report to the ceo)
      var ceo = Employee.fresh({ id: 1 });
      Employee.reopen({ name: db.attr() });
      return Employee.objects
      .where({ 'manager.name': 'jane' })
      .where({ 'manager.manager': ceo })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "employees".* FROM "employees" ' +
           'INNER JOIN "employees" "manager" ' +
           'ON "employees"."manager_id" = "manager"."id" ' +
           'INNER JOIN "employees" "manager_j1" ' +
           'ON "manager"."manager_id" = "manager_j1"."id" ' +
           'WHERE ("manager"."name" = ?) ' +
           'AND ("manager_j1"."id" = ?) ' +
           'GROUP BY "employees"."id"', ['jane', 1]);
    });

    it('allows use of relation objects in complex query (reverse setup)', function() {
      var ceo = Employee.fresh({ id: 1 });
      Employee.reopen({ name: db.attr() });
      return Employee.objects
      .where({ 'manager.manager': ceo })
      .where({ 'manager.name': 'jane' })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "employees".* FROM "employees" ' +
           'INNER JOIN "employees" "manager" ' +
           'ON "employees"."manager_id" = "manager"."id" ' +
           'INNER JOIN "employees" "manager_j1" ' +
           'ON "manager"."manager_id" = "manager_j1"."id" ' +
           'WHERE ("manager_j1"."id" = ?) ' +
           'AND ("manager"."name" = ?) ' +
           'GROUP BY "employees"."id"', [1, 'jane']);
    });
  });

  describe('hasMany', function() {
    it('generates the proper sql', function() {
      return Employee.objects.join('subordinates').where({ id: 1 }).should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "employees".* FROM "employees" ' +
           'INNER JOIN "employees" "subordinates" ' +
           'ON "subordinates"."manager_id" = "employees"."id" ' +
           'WHERE "employees"."id" = ?', [1]);
    });

    it('uses the correct table when where uses relation', function() {
      return Employee.objects.where({ 'subordinates.id': 1 }).should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "employees".* FROM "employees" ' +
           'INNER JOIN "employees" "subordinates" ' +
           'ON "subordinates"."manager_id" = "employees"."id" ' +
           'WHERE "subordinates"."id" = ? ' +
           'GROUP BY "employees"."id"', [1]);
    });

    it('expands attributes', function() {
      return Employee.objects.where({ 'subordinates.pk': 1 }).should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "employees".* FROM "employees" ' +
           'INNER JOIN "employees" "subordinates" ' +
           'ON "subordinates"."manager_id" = "employees"."id" ' +
           'WHERE "subordinates"."id" = ? ' +
           'GROUP BY "employees"."id"', [1]);
    });
  });

  describe('name conflicts', function() {
    it('works for a single join', function() {
      return Node.objects.join('nodes').where({ 'nodes.pk': 1 })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "nodes".* FROM "nodes" ' +
           'INNER JOIN "nodes" "nodes_j1" ON "nodes_j1"."parent_id" = "nodes"."id" ' +
           'WHERE "nodes_j1"."id" = ?', [1]);
    });

    it('is automatically joined via the condition', function() {
      return Node.objects.where({ 'nodes.pk': 1 })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "nodes".* FROM "nodes" ' +
           'INNER JOIN "nodes" "nodes_j1" ON "nodes_j1"."parent_id" = "nodes"."id" ' +
           'WHERE "nodes_j1"."id" = ? ' +
           'GROUP BY "nodes"."id"', [1]);
    });

    it('does not use attributes without prefix for the relation', function() {
      return Node.objects.join('nodes').where({ pk: 1 })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "nodes".* FROM "nodes" ' +
           'INNER JOIN "nodes" "nodes_j1" ON "nodes_j1"."parent_id" = "nodes"."id" ' +
           'WHERE "nodes"."id" = ?', [1]);
    });

    it('still generates standard statements', function() {
      return Node.objects.where({ id: 1 })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT * FROM "nodes" ' +
           'WHERE "id" = ?', [1]);
    });

    it('works across multiple joins', function() {
      return Node.objects.where({ 'nodes.nodes.nodes.pk': 5 })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "nodes".* FROM "nodes" ' +
           'INNER JOIN "nodes" "nodes_j1" ON "nodes_j1"."parent_id" = "nodes"."id" ' +
           'INNER JOIN "nodes" "nodes_j2" ON "nodes_j2"."parent_id" = "nodes_j1"."id" ' +
           'INNER JOIN "nodes" "nodes_j3" ON "nodes_j3"."parent_id" = "nodes_j2"."id" ' +
           'WHERE "nodes_j3"."id" = ? ' +
           'GROUP BY "nodes"."id"', [5]);
    });
  });

  describe('friends & enemies', function() {
    var Person;
    var Friendship;
    var Enmity;

    beforeEach(function() {
      Person = db.model('person', {
        name: db.attr(),
        friends: db.hasMany('person', { through: 'friendships' }),
        enemies: db.hasMany('person', { through: 'enmities' }),
      });

      Friendship = db.model('friendship', {
        person: db.belongsTo('person'),
        friend: db.belongsTo('person'),
      });

      Enmity = db.model('enmity', {
        person: db.belongsTo('person'),
        enemy: db.belongsTo('person'),
      });
    });

    it('generates a query for self-referencing many to many relationship', function() {
      // round up everyone who's friends with someone who considers the grinch
      // an enemy (they may or may not consider the grinch an enemy
      // themselves).
      return Person.objects.where({ 'friends.enemies.name': 'Grinch' })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "people".* FROM "people" ' +
           'INNER JOIN "friendships" ON "friendships"."person_id" = "people"."id" ' +
           'INNER JOIN "people" "friend" ON "friendships"."friend_id" = "friend"."id" ' +
           'INNER JOIN "enmities" ON "enmities"."person_id" = "friend"."id" ' +
           'INNER JOIN "people" "enemy" ON "enmities"."enemy_id" = "enemy"."id" ' +
           'WHERE "enemy"."name" = ? ' +
           'GROUP BY "people"."id"', ['Grinch']);
    });

    it('generates a query for self-referencing many to many relationship (simple definition)', function() {
      db = Database.create({ adapter: adapter });
      Person = db.model('person', {
        name: db.attr(),
        friends: db.hasMany('person', { join: 'friendships' }),
        enemies: db.hasMany('person', { join: 'enmities' }),
      });

      // round up everyone who's friends with someone who considers the grinch
      // an enemy (they may or may not consider the grinch an enemy
      // themselves).
      return Person.objects.where({ 'friends.enemies.name': 'Grinch' })
      .should.eventually.exist.meanwhile(adapter)
        .should.have.executed(
          'SELECT "people".* FROM "people" ' +
           'INNER JOIN "friendships" ON "friendships"."person_id" = "people"."id" ' +
           'INNER JOIN "people" "friend" ON "friendships"."friend_id" = "friend"."id" ' +
           'INNER JOIN "enmities" ON "enmities"."person_id" = "friend"."id" ' +
           'INNER JOIN "people" "enemy" ON "enmities"."enemy_id" = "enemy"."id" ' +
           'WHERE "enemy"."name" = ? ' +
           'GROUP BY "people"."id"', ['Grinch']);
    });

  });
}));
