'use strict';

var Property = require('../util/property');

var Attr = Property.extend();

module.exports = Attr.reopenClass({ __name__: 'Attr' });
