'use strict';

require('../helpers');

var _ = require('lodash');
var Promise = require('bluebird');

/**
 * Helper function to run the CLI and capture output/exit status. The resolved
 * object will contain the following properties:
 *
 *   - `stdout` - The standard output for the cli
 *   - `stderr` - The standard error for the cli
 *   - `exitStatus` - The exit status
 *   - `exitCalled` - Whether `process.exit` was called
 *
 * @param {Object} env Liftoff environment configuration.
 * @param {Function} fn The function to run, usually this is `cli`.
 * @return {Promise} A promise.
 */
module.exports.cmd = function(env, fn) {
  var details = {
    stdout: '',
    stderr: '',
    exitStatus: 0,
    exitCalled: false,
  };

  sinon.stub(process, 'exit', function(status) {
    throw _.extend(new Error('Exit called.'), {
      code: 'PROCESS_EXIT_CALLED',
      status: status || 0,
    });
  });
  sinon.stub(process.stdout, 'write', function(data) {
    details.stdout += data.toString();
  });
  sinon.stub(process.stderr, 'write', function(data) {
    details.stderr += data.toString();
  });

  return Promise
  .resolve(env)
  .then(fn)
  .catch(function(e) {
    if (e.code === 'PROCESS_EXIT_CALLED') {
      details.exitStatus = e.status;
      details.exitCalled = true;
    }
    else { throw e; }
  })
  .return(details)
  .finally(function() {
    process.exit.restore();
    process.stdout.write.restore();
    process.stderr.write.restore();
  });
};
