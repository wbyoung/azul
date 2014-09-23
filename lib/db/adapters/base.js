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
    this._grammar = new this.constructor.Grammar();
    this._translator = new this.constructor.Translator();
    this._phrasing = new this.constructor.Phrasing(this._grammar, this._translator);
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

module.exports = Adapter;
