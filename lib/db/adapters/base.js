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
    this._grammar = this.__class__.Grammar.create();
    this._translator = this.__class__.Translator.create();
    this._phrasing = this.__class__.Phrasing.create(this._grammar, this._translator);
  }
});

Adapter.reopenClass({

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @type {Grammar}
   */
  Grammar: Grammar,

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @type {Translator}
   */
  Translator: Translator,

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @type {Phrasing}
   */
  Phrasing: Phrasing

});

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
  // TODO: convert to promises
  throw new Error('The `connect` method must be implemented by subclass');
};

module.exports = Adapter;
