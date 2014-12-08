'use strict';

var Class = require('../util/class');
var CRUD = require('./phrasing_crud');
var Fragments = require('./phrasing_fragments');
var Schema = require('./phrasing_schema');
var Transaction = require('./phrasing_transaction');

/**
 * Documentation forthcoming.
 *
 * Just for building conditions.
 *
 * @public
 * @constructor
 * @param {Grammar} grammar The grammar to use when building phrases.
 */
var Phrasing = Class.extend(/** @lends Phrasing# */ {
  init: function (grammar, translator) {
    this._super();
    this._grammar = grammar;
    this._translator = translator;
  }
});

Phrasing.reopen(CRUD);
Phrasing.reopen(Fragments);
Phrasing.reopen(Schema);
Phrasing.reopen(Transaction);
Phrasing.reopen(CRUD);

module.exports = Phrasing.reopenClass({ __name__: 'Phrasing' });
