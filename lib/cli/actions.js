'use strict';

var _ = require('lodash');
var path = require('path');
var chalk = require('chalk');
var env = process.env.NODE_ENV || 'development';
var Database = require('../db/database');

_.str = require('underscore.string');

var runMigrator = function(action, azulfile, options, strings) {
  var db = Database.create(azulfile[env]);
  var migrator = db.migrator(path.resolve(options.migrations));
  var message = '';
  var batches = '';

  return migrator[action]()
  .tap(function(migrations) {
    batches = _(migrations).pluck('batch').unique().join(', ');
  })
  .then(function(migrations) {
    message += migrations.length ?
      chalk.magenta(strings.intro, 'migrations, batch', batches, '\n') :
      chalk.magenta(strings.none, '\n');
    migrations.forEach(function(migration) {
      message += chalk.cyan(migration.name, '\n');
    });
    message += chalk.gray(_.str.capitalize(env), 'environment\n');
    process.stdout.write(message);
  })
  .catch(function(e) {
    message += chalk.red(strings.action, 'failed.', e);
    process.stdout.write(message);
    process.exit(1);
  })
  .finally(function() { db.disconnect(); });
};

module.exports.migrate = function(azulfile, options) {
  return runMigrator('migrate', azulfile, options, {
    intro: 'Applying',
    action: 'Migration',
    none: 'Migrations are up-to-date'
  });
};

module.exports.rollback = function(azulfile, options) {
  return runMigrator('rollback', azulfile, options, {
    intro: 'Rolling back',
    action: 'Rollback',
    none: 'Nothing to rollback, you are at the beginning'
  });
};
