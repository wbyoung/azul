'use strict';

var Class = require('../util/class');
var CRUD = require('./phrasing_crud');
var Fragments = require('./phrasing_fragments');
var Schema = require('./phrasing_schema');
var Transaction = require('./phrasing_transaction');

/**
 * The phrasing class is used to build full statements to send to the database.
 * It is responsible for the ordering & overall structure of the queries, and
 * should use the {@link Grammar} and {@link Translator} classes to take care
 * of basic formatting & quick translations.
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
