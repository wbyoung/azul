'use strict';

module.exports.help = function(program) {
  program.help();
};

module.exports.migrate = function(options) {
  console.log('migrate');
  console.log(options.one);
};

module.exports.rollback = function(options) {
  console.log('rollback');
  console.log(options.one);
};
