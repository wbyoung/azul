'use strict';

module.exports.migrate = function(azulfile, options) {
  console.log('migrate');
  console.log(options.one);
};

module.exports.rollback = function(azulfile, options) {
  console.log('rollback');
  console.log(options.one);
};
