'use strict';

var _ = require('lodash');
var path = require('path');
var chalk = require('chalk');
var env = process.env.NODE_ENV || 'development';
var Database = require('../db/database');

_.mixin(require('underscore.string').exports());

module.exports.migrate = function(azulfile, options) {
  var db = Database.create(azulfile[env]);
  var migrator = db.migrator(path.resolve(options.migrations));

  return migrator.migrate()
  .then(function(migrations) {
    if (migrations.length) {
      var batches = _(migrations).pluck('batch').unique().value().join(', ');
      console.log(chalk.magenta('Applying migrations, batch %s'), batches);
      migrations.forEach(function(migration) {
        console.log(chalk.cyan('%s'), migration.name);
      });
    }
    else {
      console.log(chalk.magenta('Migrations are up-to-date'));
    }
    console.log(chalk.gray('%s environment'), _.capitalize(env));
  })
  .catch(function(e) {
    console.log(chalk.red('Migration failed. %s'), e);
    process.exit(1);
  })
  .finally(function() { db.disconnect(); });
};

module.exports.rollback = function(azulfile, options) {
  var db = Database.create(azulfile[env]);
  var migrator = db.migrator(path.resolve(options.migrations));

  return migrator.rollback()
  .then(function(migrations) {
    if (migrations.length) {
      var batches = _(migrations).pluck('batch').unique().value().join(', ');
      console.log(chalk.magenta('Rolling back migrations, batch %s'), batches);
      migrations.forEach(function(migration) {
        console.log(chalk.cyan('%s'), migration.name);
      });
    }
    else {
      console.log(chalk.magenta('Nothing to rollback, you are at the beginning'));
    }
    console.log(chalk.gray('%s environment'), _.capitalize(env));
  })
  .catch(function(e) {
    console.log(chalk.red('Rollback failed. %s'), e);
    process.exit(1);
  })
  .finally(function() { db.disconnect(); });
};
