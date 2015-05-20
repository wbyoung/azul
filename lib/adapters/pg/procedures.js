'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var util = require('util');

/**
 * @protected
 * @constructor
 * @extends Adapter.Procedures
 */
var PGProcedures = Adapter.Procedures.extend({

  /**
   * Override of {@link Procedure#alterTable}.
   *
   * @method
   * @public
   * @see {@link Procedure#alterTable}.
   */
  alterTable: function(data) {
    if (data.renamed.length === 0) { return undefined; }

    var procedure;
    var statement =
      this._phrasing.alterTable(_.extend({}, data, { renamed: [] }));

    // we need to create a procedure if there are multiple queries. either
    // multiple renames or a single rename & the statement for anything
    // else (add/drop columns).
    if (data.renamed.length > 1 || statement) {
      procedure = function(baseQuery) {
        var transaction = baseQuery.transaction();
        var query = baseQuery.transaction(transaction);
        var table = data.name;
        var fmt = util.format;
        var quote = this._grammar.field.bind(this._grammar);
        var promise = transaction.begin();

        if (statement) {
          promise = promise.then(function() {
            return query.raw(statement.sql, statement.args);
          });
        }

        data.renamed.forEach(function(rename) {
          promise = promise.then(function() {
            return query.raw(fmt('ALTER TABLE %s RENAME %s TO %s',
              quote(table), quote(rename.from), quote(rename.to)));
          });
        });

        return promise
        .then(function() { return transaction.commit(); })
        .catch(function(e) {
          return transaction.rollback().execute().throw(e);
        });
      }.bind(this);
    }

    return procedure;
  },

});

module.exports = PGProcedures.reopenClass({ __name__: 'PGProcedures' });
