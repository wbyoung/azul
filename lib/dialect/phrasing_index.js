'use strict';

var Mixin = require('corazon/mixin');
var Statement = require('../types/statement');

/**
 * Phrasing mixin for create/drop/rename index statements & related fragments.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Create index statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {String} table
   * @param {Index} index
   * @return {Statement} The statement.
   */
  createIndex: function(table, index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);
    var group = this._grammar.group.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);
    var fragments = [
      'CREATE INDEX ', quoteField(index.name),
      ' ON ', quoteField(table), ' '
    ]
    .concat(group(join(delimit(index.columns.map(quoteField)))));

    return Statement.create(join(fragments));
  },

  /**
   * Drop index statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {String} table
   * @param {String} index
   * @return {Statement} The statement.
   */
  dropIndex: function(table, index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var fragments = ['DROP INDEX ', quoteField(index)];
    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Rename index statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {String} table
   * @param {Object} index
   * @return {Statement} The statement.
   */
  renameIndex: function(table, index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var fragments = [
      'ALTER INDEX ', quoteField(index.from),
      ' RENAME TO ', quoteField(index.to)
    ];
    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Index fragment for inline use.
   *
   * @method
   * @public
   * @param {Index} index
   * @return {Fragment} The fragment.
   */
  indexFragment: function(index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);
    var fragments = ['INDEX ', quoteField(index.name)];
    fragments.push(' (');
    fragments = fragments.concat(delimit(index.columns.map(quoteField)));
    fragments.push(')');
    return this._grammar.join(fragments);
  },

  /**
   * Add index fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Index} index
   * @return {Fragment} The fragment.
   * @see {@link Phrasing#indexFragment}
   */
  addIndexFragment: function(index) {
    return this._grammar.join(['ADD ', this.indexFragment(index)]);
  },

  /**
   * Drop index fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {String} index
   * @return {Fragment} The fragment.
   */
  dropIndexFragment: function(index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    return this._grammar.join(['DROP INDEX ', quoteField(index)]);
  },

  /**
   * Rename index fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Object} index
   * @return {Fragment} The fragment.
   */
  renameIndexFragment: function(index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    return this._grammar.join(['RENAME INDEX ',
      quoteField(index.from), ' TO ', quoteField(index.to)]);
  },

});
