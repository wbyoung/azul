'use strict';

var Class = require('../../util/class');
var Grammar = require('../grammar');
var Translator = require('../grammar/translator');
var Phrasing = require('../grammar/phrasing');

/**
 * The base Adapter class is the extension point for custom database adapters.
 * As a user of Agave, you typically won't use this, but if you're looking to
 * add support for a custom database, you should start here.
 *
 * @since 1.0
 * @public
 * @constructor
 */
var Adapter = Class.extend({
  init: function() {
    // TODO: try to use prototype chain to look up each class instead of this
    // clunky lookup that resorts to looking on the adapter.
    this._grammar = new (this.constructor.Grammar || Adapter.Grammar)();
    this._translator = new (this.constructor.Translator || Adapter.Translator)();
    this._phrasing = new (this.constructor.Phrasing || Adapter.Phrasing)(this._grammar, this._translator);
  }
});


/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @type {Grammar}
 */
Adapter.Grammar = Grammar;

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @type {Translator}
 */
Adapter.Translator = Translator;


/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @type {Phrasing}
 */
Adapter.Phrasing = Phrasing;


/**
 * Access to the {@link Translator} instance.
 *
 * @name Adapter#translator
 * @since 1.0
 * @public
 * @type {Translator}
 * @readonly
 */
Adapter.defineAccessor('translator');

/**
 * Access to the {@link Phrasing} instance.
 *
 * @name Adapter#phrasing
 * @since 1.0
 * @public
 * @type {Phrasing}
 * @readonly
 */
Adapter.defineAccessor('phrasing');

/**
 * Create a connection.
 *
 * @todo refine the ideas here so that it will support pooling and all possible
 * databases.
 * @param {Object} connection The connection object.
 * @param {Function} cb Callback to call when connection has been established.
 * @see {@link Database}
 */
Adapter.prototype.connect = function(/*cb*/) {
  throw new Error('The `connect` method must be implemented by subclass');
};

module.exports = Adapter;
