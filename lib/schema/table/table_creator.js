'use strict';

var _ = require('lodash');
var Class = require('corazon/class');
var Column = require('./column');
var property = require('corazon/property');

/**
 * Helper method for defining methods that can create attributable columns that
 * are pushed into the columns array.
 *
 * @private
 * @function TableCreator~col
 * @param {String} type The type of the column to create.
 * @return {Function} A function that can be used to create a column by passing
 * it the column name and any options.
 */
var col = function(type) {
  return function(name, options, index) {
    var opts = options || {};
    var column = Column.create({
      table: this._table,
      name: name,
      type: type,
      options: opts
    });
    index = (index === undefined) ? this._columns.length : index;
    this._columns.splice(index, 0, column);
    return column;
  };
};

/**
 * A class that can create columns for tables.
 *
 * @protected
 * @constructor TableCreator
 */
var TableCreator = Class.extend({
  init: function(table) {
    this._super.apply(this, arguments);
    this._table = table;
    this._columns = [];
    this._indexes = [];
  },

  /**
   * Created columns.
   *
   * @private
   * @scope internal
   * @type {Array.<Column>}
   * @readonly
   */
  columns: property(),

  /**
   * @typedef {Object} Index
   * @property {String} name The index name.
   * @property {Array.<String>} columns The names of the columns for the index.
   */

  /**
   * Created indexes.
   *
   * @private
   * @scope internal
   * @type {Array.<Index>}
   * @readonly
   */
  indexes: property(),

  /**
   * Alias for {@link TableCreator#serial}.
   *
   * @method
   * @public
   * @see {@link TableCreator#serial}
   * @see {@link Translator#typeForSerial}
   */
  auto: col('serial'),

  /**
   * Alias for {@link TableCreator#serial}.
   *
   * @method
   * @public
   * @see {@link TableCreator#serial}
   * @see {@link Translator#typeForSerial}
   */
  increments: col('serial'),

  /**
   * Create a serial column.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForSerial}
   */
  serial: col('serial'),

  /**
   * Create a integer column.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForInteger}
   */
  integer: col('integer'),

  /**
   * Create a 64 bit integer column.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForInteger64}
   */
  integer64: col('integer64'),

  /**
   * Create a column that can hold short strings.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForString}
   */
  string: col('string'),

  /**
   * Create a column that can hold arbitrary amounts of text.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForText}
   */
  text: col('text'),

  /**
   * Create a binary column.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForBinary}
   */
  binary: col('binary'),

  /**
   * Create a boolean column.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForBool}
   */
  bool: col('bool'),

  /**
   * Create a column to hold dates.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForDate}
   */
  date: col('date'),

  /**
   * Create a column to hold times.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForTime}
   */
  time: col('time'),

  /**
   * Create a column to hold datetimes.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForDateTime}
   */
  dateTime: col('dateTime'),

  /**
   * Create a float column.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForFloat}
   */
  float: col('float'),

  /**
   * Create a decimal column.
   *
   * @method
   * @public
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForDecimal}
   */
  decimal: col('decimal'),

  /**
   * Add an index.
   *
   * @method
   * @public
   * @param {String|Array.<String>} columns The columns for the index
   * @param {Object} [options]
   * @param {String} [options.name] The name of the index.
   */
  index: function(columns, options) {
    var cols = _.isArray(columns) ? columns : [columns];
    this._indexes.push({
      name: this._indexName(columns, options),
      columns: cols,
    });
  },

  /**
   * Generate an index name from columns & options.
   *
   * @method
   * @protected
   * @param {String|Array.<String>} columns
   * @param {Object} [options]
   * @return {String}
   * @see {@link TableCreator#index}
   */
  _indexName: function(columns, options) {
    var opts = _.defaults({}, options, {});
    var cols = _.isArray(columns) ? columns : [columns];
    return opts.name || this._table + '_' + cols.join('_') + '_idx';
  },

});

module.exports = TableCreator.reopenClass({
  __name__: 'Table~TableCreator'
});
