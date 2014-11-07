'use strict';

if (require.main !== module) { return; }

process.argv.splice(2);
process.argv.splice(2, 0, '--help');

process.on('exit', function() {
  process.send({ modules: Object.keys(require.cache) });
});

require('../../../lib/cli')({ modulePath: '.', configPath: 'azulfile.js' });
