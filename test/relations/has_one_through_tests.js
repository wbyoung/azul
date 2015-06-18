'use strict';

require('../helpers');

var Supplier;
var supplier;

describe('Model.hasOne :through', __db(function() {
  /* global db, adapter */

  beforeEach(require('../common').models);
  beforeEach(function() {
    Supplier = db.model('supplier');
    supplier = Supplier.$({ id: 489 });
  });

  describe('relation', function() {

    it('fetches related objects', function() {
      return supplier.fetchAccountHistory()
      .should.eventually.be.a.model('accountHistory')
      .with.json({ id: 832, details: 'many details', accountId: 392 })
      .meanwhile(adapter).should.have.executed(
        'SELECT "account_histories".* FROM "account_histories" ' +
        'INNER JOIN "accounts" ' +
        'ON "account_histories"."account_id" = "accounts"."id" ' +
        'WHERE "accounts"."supplier_id" = ? LIMIT 1', [489]);
    });

  });

  describe('joins', function() {
    it('automatically determines joins from conditions', function() {
      return Supplier.objects.where({ 'accountHistory.details': 'details' }).fetch()
      .should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT "suppliers".* FROM "suppliers" ' +
        'INNER JOIN "accounts" ' +
        'ON "accounts"."supplier_id" = "suppliers"."id" ' +
        'INNER JOIN "account_histories" ' +
        'ON "account_histories"."account_id" = "accounts"."id" ' +
        'WHERE "account_histories"."details" = ? ' +
        'GROUP BY "suppliers"."id"', ['details']);
    });
  });

  describe('pre-fetch', function() {
    it('executes multiple queries', function() {
      return Supplier.objects.with('accountHistory').fetch()
      .should.eventually.exist.meanwhile(adapter)
      .should.have.executed(
        'SELECT * FROM "suppliers"',
        'SELECT * FROM "accounts" WHERE "supplier_id" ' +
        'IN (?, ?) LIMIT 2', [229, 430],
        'SELECT * FROM "account_histories" WHERE "account_id" ' +
        'IN (?, ?) LIMIT 2', [392, 831]);
    });
  });

}));
