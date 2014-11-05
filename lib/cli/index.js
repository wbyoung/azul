'use strict';

/**
 * The command line interface module.
 *
 * While working within this module, considerations to take into
 * account include, but are not limited to:
 *
 * - The module is loaded by the CLI before the Liftoff has completed, so it
 *   is always included from the globally installed Azul module.
 *
 * - Since it is possible that Liftoff will require spawning a new node process
 *   to handle any v8 flags, it is possible for the module to end up being
 *   required more than once (in separate processes) before {@link cli.run} is
 *   actually called. It's therefore important to limit the scope of work
 *   performed in this module (especially work that is not contained within
 *   {@link cli.run}).
 *
 * - The exported {@link cli.run} function is called by the Liftoff invocation
 *   from a local install of Azul if it is available, but will be called from
 *   the globally installed Azul if a local version is not found. When called
 *   from the global install, there is an expectation that the CLI provide
 *   basic help functionality, but not actually execute any commands.
 *
 * - Requiring any other dependencies from within the Azul module before
 *   checking if this is loaded from a local install is not recommended. This
 *   includes requires both at the module level as well as within the
 *   {@link cli.run} function.
 *
 * @namespace cli
 * @private
 */

var _ = require('lodash');
var program = require('commander');
var chalk = require('chalk');
var tildify = require('tildify');


/**
 * Run the command line interface using a Liftoff configuration.
 *
 * There are some considerations to take into account when working with this
 * function that have been outlined in {@link cli}.
 *
 * @private
 * @function cli.run
 * @param {Object} env The liftoff environment.
 * @see cli
 */
module.exports = function(env) {

  // we need capture the requested action & execute it after checking that all
  // required values are set on env. this allows the cli to still run things
  // like help when azul is not installed locally or is missing a configuration
  // file.
  var action = { name: 'help', args: [program] };
  var captureAction = function() {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var options = _.last(args);
      action.name = options.name();
      action.args = args;
    }
  };

  program
    .version(require('../../package.json').version)
    .usage('[options] command')
    .option('--cwd <cwd>', 'change the current working directory')
    .option('--azulfile <azulfile>', 'use a specific config file')
    .option('--require <require>', 'require external module')
    .option('--completion <value>', 'a method to handle shell completions');

  program.command('migrate')
    .option('-o, --one', 'migrate forward just one migration')
    .description('migrate to the latest schema')
    .action(captureAction());

  program.command('rollback')
    .option('-o, --one', 'rollback forward just one migration')
    .description('rollback the last migration')
    .action(captureAction());

  program.parse(process.argv);

  if (!env.modulePath) {
    console.log(chalk.red('Local azul not found in'),
      chalk.magenta(tildify(env.cwd)));
    console.log(chalk.red('Try running: npm install azul'));
    process.exit(1);
  }

  if (!env.configPath) {
    console.log(chalk.red('No azulfile found'));
    process.exit(1);
  }

  // at this point, we can require modules from within Azul since we know we're
  // working with the local install.
  var actions = require('./actions');
  var fn = actions[action.name];
  var args = action.args;
  fn.apply(undefined, args);
};

module.exports.require = function (name, module) {
  console.log('Requiring external module', chalk.magenta(name));
};

module.exports.requireFail = function (name, err) {
  console.log(chalk.red('Failed to load external module'), chalk.magenta(name));
};

module.exports.respawn = function (flags, child) {
  console.log('Node flags detected:', chalk.magenta(flags.join(', ')));
  console.log('Respawned to PID:', chalk.magenta(child.pid));
};
