'use strict';

var Adapter = require('../base');
var Statement = require('../../types/statement');

/**
 * @protected
 * @constructor
 * @extends Adapter.Phrasing
 */
var MySQLPhrasing = Adapter.Phrasing.extend({

  /**
   * Override of {@link Phrasing#columnFragment}.
   *
   * The base class adds REFERENCES to each column definition which MySQL
   * parses, but does not use to create FOREIGN KEY constraints. We need to
   * add a FOREIGN KEY constraint for each created column.
   *
   * @method
   * @public
   * @see {@link Phrasing#columnFragment}.
   */
  columnFragment: function(column) {
    var generic = this._super.apply(this, arguments);
    var fragments = [generic];
    if (column.options.references) {
      fragments.push(', ',
        this.foreignKeyConstraint(column));
    }
    return this._grammar.join(fragments);
  },

  /**
   * Override of {@link Phrasing#addColumnFragment}.
   *
   * The base class adds REFERENCES to each column definition which MySQL
   * parses, but does not use to create FOREIGN KEY constraints. We need to
   * add a FOREIGN KEY constraint for each added column.
   *
   * Uses the super class create column method to generate the column
   * details.
   *
   * @method
   * @public
   * @see {@link Phrasing#addColumnFragment}.
   */
  addColumnFragment: function(column) {
    var columnFragment = this.columnFragment.superFunction.bind(this);
    var fragments = ['ADD COLUMN ', columnFragment(column)];
    if (column.options.references) {
      fragments.push(', ADD ',
        this.foreignKeyConstraint(column));
    }
    return this._grammar.join(fragments);
  },

  /**
   * Override of {@link Phrasing#renameColumnFragment}.
   *
   * @method
   * @public
   * @see {@link Phrasing#renameColumnFragment}.
   */
  renameColumnFragment: function(column) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var type = this._translator.type(column.type);
    var fragments = ['CHANGE ',
      quoteField(column.from), ' ',
      quoteField(column.to), ' ',
      type,
    ];
    return this._grammar.join(fragments);
  },

  /**
   * Override of {@link Phrasing#foreignKeyFragment}.
   *
   * Since the base class defines foreign keys using REFERENCES, we just
   * return nothing here so we don't repeat that multiple times. The only
   * real reason is to avoid confusion if someone reads the executed SQL
   * statements. It would not affect how the queries worked.
   *
   * @method
   * @public
   * @see {@link Phrasing#foreignKeyFragment}.
   */
  foreignKeyFragment: function(/*column*/) {
    return undefined;
  },

  /**
   * Generate foreign key constraint that works for MySQL.
   *
   * Uses the super class foreign key method to generate the REFERENCES
   * portion of the constraint string.
   *
   * @method
   * @public
   * @param {Object} column
   * @return {Fragment} The fragment.
   */
  foreignKeyConstraint: function(column) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var fragments = ['FOREIGN KEY (', quoteField(column.name), ') '];
    var foreignKey = this.foreignKeyFragment.superFunction.bind(this);
    fragments.push(foreignKey(column));
    return this._grammar.join(fragments);
  },

  /**
   * Override of {@link Phrasing#dropIndex}
   *
   * @method
   * @public
   * @see {@link Phrasing#dropIndex}
   */
  dropIndex: function(table, index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var fragments = ['DROP INDEX ', quoteField(index),
      ' ON ', quoteField(table)];
    return Statement.create(this._grammar.join(fragments));
  },

});

module.exports = MySQLPhrasing.reopenClass({ __name__: 'MySQLPhrasing' });
