'use strict';

var _ = require('lodash');
var path = require('path');
var chalk = require('chalk');
var env = process.env.NODE_ENV || 'development';
var Database = require('../db/database');

module.exports.migrate = function(azulfile, options) {
  var db = Database.create(azulfile[env]);
  var migrator = db.migrator(path.resolve(options.migrations));

  return migrator.migrate()
  .then(function(migrations) {
    var batches = _(migrations).pluck('batch').unique().value().join(', ');
    console.log(chalk.magenta('Applying migrations, batch %s'), batches);
    migrations.forEach(function(migration) {
      console.log(chalk.cyan('%s'), migration.name);
    });
  })
  .catch(function(e) {
    console.log(chalk.red('Migration failed. %s'), e);
    process.exit(1);
  })
  .finally(function() { db.disconnect(); });
};

module.exports.rollback = function(azulfile, options) {
  console.log('rollback');
};
