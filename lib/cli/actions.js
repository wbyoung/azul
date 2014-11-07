'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var env = process.env.NODE_ENV || 'development';
var Database = require('../db/database');

module.exports.migrate = function(azulfile, options) {
  var db = Database.create(azulfile[env]);
  var migrator = db.migrator(options.migrations);

  return migrator.migrate()
  .then(function(migrations) {
    _(migrations).pluck('batch').unique().forEach(function(batch) {
      console.log(chalk.magenta('batch %d'), batch);
    });
    migrations.forEach(function(migration) {
      console.log(chalk.cyan('applied %s'), migration.name);
    });
  })
  .catch(function(e) {
    console.log(chalk.red('Failed to migrate. %s'), e);
  });
};

module.exports.rollback = function(azulfile, options) {
  console.log('rollback');
};
