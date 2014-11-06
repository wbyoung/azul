'use strict';

if (require.main !== module) { return; }

require('../../../lib/cli');

process.send({ modules: Object.keys(require.cache) });
