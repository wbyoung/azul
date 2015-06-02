'use strict';

var _ = require('lodash');
var Class = require('corazon/class');
var property = require('corazon/property');
var Mixin = require('corazon/mixin');
var Promise = require('bluebird');
var Statement = require('../../types/statement');

/**
 * The pseudo-return class. This is used as a marker to allow embedding of a
 * pseudo-return item & extraction of that item by using type checking.
 *
 * It's really just a wrapper around a field name (string) that can be type
 * checked.
 *
 * @protected
 * @constructor PseudoReturn
 * @param {String} field The field name that's requested to be returned.
 */
var PseudoReturn = Class.extend(/** @lends PseudoReturn# */ {
  init: function(field) {
    this._field = field;
  },

  /**
   * The field name for this pseudo-return.
   *
   * @public
   * @type {String}
   */
  field: property()
});


/**
 * This is intended to be mixed into the {@link Phrasing} class for any
 * adapters that do not natively support `returning` for
 * {@link Phrasing#insert}. It embeds the `returning` value into the statement
 * arguments. Together with {@link ExtractPseudoReturn}, it allows adapters to
 * more easily add support for insert queries that use `returning`.
 *
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
 * This is a callback function that allows specifying the result value for a
 * pseudo-return and also has a few properties defined on it.
 *
 * @function PseudoReturn~Capture
 * @param {Object} value The value that was captured for the requested field.
 * @property {Boolean} enabled Whether or not capture is enabled.
 * @property {String} field The name of the field to capture.
 */

/**
 * This is intended to be mixed into an {@link Adapter} class for any adapters
 * that do not natively support `returning` for {@link Phrasing#insert}.
 * Together with {@link EmbedPseudoReturn}, it allows adapters to more easily
 * add support for insert queries that use `returning`.
 *
 * This must be mixed in after the adapter overrides {@link Adapter#_execute}.
 * The adapter should also define the {@link Adapter#_execute} method to take
 * one additional argument, an {@link PseudoReturn~Capture} function that it
 * should call when the query has completed and the value for the field is
 * known.
 *
 * @protected
 * @mixin ExtractPseudoReturn
 */
var ExtractPseudoReturn = Mixin.create(/** @lends ExtractPseudoReturn */ {

  /**
   * Override of {@link Adapter#_execute}. This will call the super class
   * implementation with an additional argument of a
   * {@link PseudoReturn~Capture} function/object that can be used to set the
   * value that will be used for `returning` base insert queries.
   *
   * @method
   * @private
   * @see {@link Adapter#_execute}
   */
  _execute: Promise.method(function(client, sql, args) {
    var captured;
    var capture = _.noop;
    args = args.filter(function(arg) {
      var pseudo = arg instanceof PseudoReturn.__class__;
      if (pseudo) {
        capture = function(value) { captured = value || null; };
        capture.enabled = true;
        capture.field = arg.field;
      }
      return !pseudo;
    });
    return this._super(client, sql, args, capture).then(function(result) {
      if (captured !== undefined) {
        var row = _.object([capture.field], [captured]);
        _.merge(result.rows, [row]);
        _.merge(result.fields, [capture.field]);
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
