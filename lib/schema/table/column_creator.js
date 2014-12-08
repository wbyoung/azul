'use strict';

var Class = require('../../util/class');
var ColumnAttributor = require('./column_attributor');

/**
 * Helper method for defining methods that can create attributable columns that
 * are pushed into the columns array.
 *
 * @private
 * @function ColumnCreator~col
 * @param {String} type The type of the column to create.
 * @return {Function} A function that can be used to create a column by passing
 * it the column name and any options.
 */
var col = function(type) {
  return function(name, options) {
    var opts = options || {};
    var column = {
      name: name,
      type: type,
      options: opts
    };
    this._columns.push(column);
    return ColumnAttributor.create(column);
  };
};

/**
 * @typedef {Object} ColumnCreator~Column
 * @property {String} name The name of the column.
 * @property {String} type The type of the column.
 * @property {Object} options Options that have been enabled for this column.
 */

/**
 * A class that can create columns for tables.
 *
 * @protected
 * @constructor ColumnAttributor
 * @param {Array} columns An empty array that will be mutated to contain
 * {@link ColumnCreator~Column} objects as they are created.
 */
var ColumnCreator = Class.extend({
  init: function(columns) {
    this._super();
    this._columns = columns;
  },

  /**
   * Alias for {@link ColumnCreator#serial}.
   *
   * @public
   * @method
   * @see {@link ColumnCreator#serial}
   * @see {@link Translator#typeForSerial}
   */
  auto: col('serial'),

  /**
   * Alias for {@link ColumnCreator#serial}.
   *
   * @public
   * @method
   * @see {@link ColumnCreator#serial}
   * @see {@link Translator#typeForSerial}
   */
  increments: col('serial'),

  /**
   * Create a serial column.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForSerial}
   */
  serial: col('serial'),

  /**
   * Create a integer column.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForInteger}
   */
  integer: col('integer'),

  /**
   * Create a 64 bit integer column.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForInteger64}
   */
  integer64: col('integer64'),

  /**
   * Create a column that can hold short strings.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForString}
   */
  string: col('string'),

  /**
   * Create a column that can hold arbitrary amounts of text.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForText}
   */
  text: col('text'),

  /**
   * Create a binary column.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForBinary}
   */
  binary: col('binary'),

  /**
   * Create a boolean column.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForBool}
   */
  bool: col('bool'),

  /**
   * Create a column to hold dates.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForDate}
   */
  date: col('date'),

  /**
   * Create a column to hold times.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForTime}
   */
  time: col('time'),

  /**
   * Create a column to hold datetimes.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForDateTime}
   */
  dateTime: col('dateTime'),

  /**
   * Create a float column.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForFloat}
   */
  float: col('float'),

  /**
   * Create a decimal column.
   *
   * @public
   * @method
   * @param {String} name The column name.
   * @param {Object} [options] The options for the column.
   * @see {@link Translator#typeForDecimal}
   */
  decimal: col('decimal')
});

module.exports = ColumnCreator.reopenClass({
  __name__: 'Table~ColumnCreator'
});
