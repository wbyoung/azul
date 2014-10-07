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
var Adapter = Class.extend(/** @lends Adapter# */ {
  init: function() {
    this._grammar = this.__identity__.Grammar.create();
    this._translator = this.__identity__.Translator.create();
    this._phrasing = this.__identity__.Phrasing.create(this._grammar, this._translator);
  }
});

Adapter.reopenClass(/** @lends Adapter */ {

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

Adapter.reopen(/** @lends Adapter# */ {

  /**
   * Create a connection.
   *
   * @todo refine the ideas here so that it will support pooling and all possible
   * databases.
   * @param {Object} connection The connection object.
   * @return {Promise} Promise to resolve when connection has been established.
   * @see {@link Database}
   */
  connect: function() {
    throw new Error('The `connect` method must be implemented by subclass');
  },

  /**
   * Destroy a connection.
   *
   * @todo refine the ideas here so that it will support pooling and all possible
   * databases.
   * @param {Object} connection The connection object.
   * @return {Promise} Promise to resolve when connection has been closed.
   * @see {@link Database}
   */
  disconnect: function() {
    throw new Error('The `disconnect` method must be implemented by subclass');
  }

});

module.exports = Adapter.reopenClass({ __name__: 'Adapter' });
