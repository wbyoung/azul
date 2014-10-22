'use strict';

var RawQuery = require('./raw');
var Where = require('./mixins/where');

/**
 * Begin a delete query chain. Like all other methods that begin a query chain,
 * this method is intended to be called only once and is mutually exclusive
 * with those methods.
 *
 * Documentation forthcoming.
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the {@link Database}.
 *
 * @since 1.0
 * @public
 * @method Query#delete
 * @param {String} table The table in which to delete data.
 * @return {DeleteQuery} The newly configured query.
 * @see Database#delete
 */

/**
 * A delete query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Query#delete}.
 *
 * @since 1.0
 * @protected
 * @constructor DeleteQuery
 * @extends RawQuery
 * @mixes Where
 */
var DeleteQuery = RawQuery.extend(Where, /** @lends DeleteQuery# */{
  init: function() {
    var args = Array.prototype.slice.call(arguments);
    this._super(args.shift());
    this._create.apply(this, args);
  },

  _create: function(table) {
    this._table = table;
  },

  _take: function(orig) {
    this._super(orig);
    this._table = orig._table;
  },

  sql: function() {
    return this._adapter.phrasing.delete({
      table: this._table,
      where: this._where
    });
  }

});

module.exports = DeleteQuery.reopenClass({ __name__: 'DeleteQuery' });
