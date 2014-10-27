'use strict';

var _ = require('lodash');
var Class = require('../../../util/class');
var Mixin = require('../../../util/mixin');

/**
 * Documentation forthcoming.
 */
var PseudoReturn = Class.extend({
  init: function(field) {
    this._field = field;
  }
});

/**
 * Documentation forthcoming.
 */
PseudoReturn.defineAccessor('field');

/**
 * Documentation forthcoming.
 *
 * For phrasing.
 */
var EmbedPseudoReturn = Mixin.create({
  // TODO: implement this so that it appends a PseudoReturn during the phrasing
  // of insert statements.
});

/**
 * Documentation forthcoming.
 *
 * For adapter, must be mixed in after standard setup.
 */
var ExtractPseudoReturn = Mixin.create({
  /**
   * Documentation forthcoming.
   */
  _execute: function(client, sql, args) {
    var captured;
    var capture = function() {};
    args = args.filter(function(arg) {
      var pseudo = arg instanceof PseudoReturn.__class__;
      if (pseudo) {
        capture = function(id) {
          captured = id ? { id: id, column: arg.field } : undefined;
        };
      }
      return !pseudo;
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
  PseudoReturn: PseudoReturn,
  ExtractPseudoReturn: ExtractPseudoReturn,
  EmbedPseudoReturn: EmbedPseudoReturn
};
