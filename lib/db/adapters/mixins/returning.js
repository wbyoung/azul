'use strict';

var _ = require('lodash');
var Mixin = require('../../../util/mixin');

/**
 * Documentation forthcoming.
 *
 * For phrasing.
 */
var EmbedPseudoReturn = Mixin.create({

});

/**
 * Documentation forthcoming.
 *
 * For adapter, must be mixed in after standard setup.
 */
var ExtractPseudoReturn = Mixin.create({
  // TODO: it'd be better for the embedding to simply add an argument
  // containing the required information & be able to pull that out of the
  // args that it would be to parse the sql sting and possibly make mistakes
  // with escaping.

  /**
   * Documentation forthcoming.
   */
  _execute: function(client, sql, args) {
    var captured;
    var capture = function() {};
    sql = sql.replace(/\s*RETURNING\s+(\w+)/i, function(match, column) {
      capture = function(id) {
        captured = id ? { id: id, column: column } : undefined;
      };
      return '';
    });
    return this._super(client, sql, args, capture).then(function(result) {
      if (captured) {
        var row = _.object([captured.column], [captured.id]);
        _.merge(result.rows, [row]);
        _.merge(result.fields, [captured.column]);
      }
      return result;
    });
  }
});

module.exports = {
  ExtractPseudoReturn: ExtractPseudoReturn,
  EmbedPseudoReturn: EmbedPseudoReturn
};
