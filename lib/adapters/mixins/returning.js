'use strict';

var _ = require('lodash');
var Class = require('../../util/class');
var property = require('../../util/property').fn;
var Mixin = require('../../util/mixin');
var BluebirdPromise = require('bluebird');
var Statement = require('../../grammar/statement');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @protected
 * @constructor PseudoReturn
 */
var PseudoReturn = Class.extend(/** @lends PseudoReturn# */ {
  init: function(field) {
    this._field = field;
  }
});

/**
 * Documentation forthcoming.
 */
PseudoReturn.reopen(/** @lends PseudoReturn# */ { field: property() });

/**
 * Documentation forthcoming.
 *
 * For phrasing.
 *
 * @since 1.0
 * @protected
 * @mixin EmbedPseudoReturn
 */
var EmbedPseudoReturn = Mixin.create(/** @lends EmbedPseudoReturn */ {
  insert: function(data) {
    var returning = data.returning;
    var result = this._super(_.extend(data, { returning: undefined }));
    var value = result.value;
    var args = result.args;
    if (returning) {
      args = [].concat(args, [PseudoReturn.create(returning)]);
    }
    return Statement.create(value, args);
  }
});

/**
 * Documentation forthcoming.
 *
 * For adapter, must be mixed in after standard setup.
 *
 * @since 1.0
 * @protected
 * @mixin ExtractPseudoReturn
 */
var ExtractPseudoReturn = Mixin.create(/** @lends ExtractPseudoReturn */ {
  /**
   * Documentation forthcoming.
   */
  _execute: BluebirdPromise.method(function(client, sql, args) {
    var captured;
    var capture = function() {};
    args = args.filter(function(arg) {
      var pseudo = arg instanceof PseudoReturn.__class__;
      if (pseudo) {
        capture = function(id) {
          captured = { id: id, column: arg.field };
        };
        capture.enabled = true;
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
  })
});

module.exports = {
  PseudoReturn: PseudoReturn,
  ExtractPseudoReturn: ExtractPseudoReturn,
  EmbedPseudoReturn: EmbedPseudoReturn
};
