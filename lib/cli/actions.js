'use strict';

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var chalk = require('chalk');
var util = require('util');
var env = process.env.NODE_ENV || 'development';
var Database = require('../database');

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
    message += chalk.gray(_.capitalize(env), 'environment\n');
    process.stdout.write(message);
  })
  .catch(function(e) {
    message += chalk.red(strings.action, 'failed.', e);
    process.stderr.write(message);
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

module.exports.init = function(options, db) {
  db = require('../adapters/aliases')[db || 'pg'];

  if (fs.existsSync('azulfile.js') || fs.existsSync('azulfile.json')) {
    process.stdout.write(chalk.gray('Already initialized\n'));
  }
  else if (!db) {
    process.stderr.write(chalk.red(
      util.format('Invalid database: %s\n', db)));
    process.exit(1);
  }
  else {
    var source = path.join(__dirname, '../templates/azulfile.js.template');
    var content = fs.readFileSync(source);
    var templated = _.template(content)({ database: db });
    fs.writeFileSync('azulfile.js', templated);
    process.stdout.write(chalk.magenta('Initialization complete\n'));
  }
};

module.exports['make-migration'] = function(azulfile, options, name) {
  try { fs.mkdirSync('migrations'); }
  catch (e) { if (e.code !== 'EEXIST') { throw e; } }

  var prefix = new Date().toISOString().split('.')[0].replace(/[^\d]/g, '');
  var fileName = [prefix, _.snakeCase(name) + '.js'].join('_');

  var source = path.join(__dirname, '../templates/migration.js.template');
  var dest = path.join('migrations', fileName);
  var content = fs.readFileSync(source);
  var templated = _.template(content)({ name: name });
  fs.writeFileSync(dest, templated);
  process.stdout.write(chalk.magenta(fileName + '\n'));
};
