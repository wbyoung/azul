'use strict';

require('../helpers');

var _ = require('lodash');
var actions = require('../../lib/cli/actions');
var cmd = require('./cli_helpers').cmd;
var path = require('path');
var fs = require('fs');

var config,
  migrations,
  azulfile;

describe('CLI', __adapter(function() {
  /* global adapter */

  beforeEach(function() {
    config = { adapter: adapter };
    migrations = path.join(__dirname, '../fixtures/migrations/blog');
    azulfile = {
      development: config,
      production: config,
      staging: config,
      test: config,
    };
  });

  describe('init action', function() {
    beforeEach(function() {
      sinon.stub(fs, 'writeFileSync');
    });

    afterEach(function() {
      fs.writeFileSync.restore();
    });

    it('creates a new file', function() {
      return cmd({}, function() {
        return actions.init({ database: 'pg' });
      })
      .then(function(proc) {
        expect(proc.exitStatus).to.eql(0);
        expect(proc.exitCalled).to.eql(false);
        expect(proc.stdout).to.match(/initialization complete/i);
        expect(fs.writeFileSync).to.have.been.calledOnce;
        expect(fs.writeFileSync).to.have.been.calledWith('azulfile.js');
        expect(fs.writeFileSync.getCall(0).args[1])
          .to.match(/production:[^]*development:[^]*test:/);
      });
    });

    it('fails when given a bad database', function() {
      return cmd({}, function() {
        return actions.init({}, 'invalid');
      })
      .then(function(proc) {
        expect(proc.exitStatus).to.eql(1);
        expect(proc.exitCalled).to.eql(true);
        expect(proc.stderr).to.match(/invalid database/i);
        expect(fs.writeFileSync).to.not.have.been.called;
      });
    });

    describe('when azulfile.js exists', function() {
      beforeEach(function() {
        sinon.stub(fs, 'existsSync');
        fs.existsSync.withArgs('azulfile.js').returns(true);
      });

      afterEach(function() {
        fs.existsSync.restore();
      });

      it('does not re-initialize', function() {
        return cmd({}, function() {
          return actions.init({ database: 'pg' });
        })
        .then(function(proc) {
          expect(proc.exitStatus).to.eql(0);
          expect(proc.exitCalled).to.eql(false);
          expect(proc.stdout).to.match(/already initialized/i);
          expect(fs.writeFileSync).to.not.have.been.called;
        });
      });
    });

    describe('when azulfile.json exists', function() {
      beforeEach(function() {
        sinon.stub(fs, 'existsSync');
        fs.existsSync.withArgs('azulfile.json').returns(true);
      });

      afterEach(function() {
        fs.existsSync.restore();
      });

      it('does not re-initialize', function() {
        return cmd({}, function() {
          return actions.init({ database: 'pg' });
        })
        .then(function(proc) {
          expect(proc.exitStatus).to.eql(0);
          expect(proc.exitCalled).to.eql(false);
          expect(proc.stdout).to.match(/already initialized/i);
          expect(fs.writeFileSync).to.not.have.been.called;
        });
      });
    });
  });

  describe('generate migration action', function() {
    beforeEach(function() {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'writeFileSync');
    });

    afterEach(function() {
      fs.mkdirSync.restore();
      fs.writeFileSync.restore();
    });

    it('creates a the migration directory', function() {
      return cmd({}, function() {
        return actions['make-migration'](azulfile, {}, 'initial');
      })
      .then(function(proc) {
        expect(proc.exitStatus).to.eql(0);
        expect(proc.exitCalled).to.eql(false);
        expect(fs.mkdirSync).to.have.been.calledOnce;
        expect(fs.mkdirSync).to.have.been.calledWith('migrations');
      });
    });

    it('creates the migration file', function() {
      return cmd({}, function() {
        return actions['make-migration'](azulfile, {}, 'initialMigration');
      })
      .then(function(proc) {
        expect(proc.exitStatus).to.eql(0);
        expect(proc.exitCalled).to.eql(false);
        expect(proc.stdout).to.match(/\d{14}_initial_migration.js/i);
        expect(fs.writeFileSync).to.have.been.calledOnce;
        expect(fs.writeFileSync.getCall(0).args[0])
          .to.match(/migrations\/\d{14}_initial_migration\.js/);
        expect(fs.writeFileSync.getCall(0).args[1])
          .to.match(/exports.up[^]*exports.down[^]/);
      });
    });

    describe('when the migrations directory already exists', function() {
      beforeEach(function() {
        fs.mkdirSync.restore();

        var error = new Error('EEXIST, file already exists \'migrations\'');
        sinon.stub(fs, 'mkdirSync').throws(_.extend(error, {
          errno: 47,
          code: 'EEXIST',
          path: 'migrations',
          syscall: 'mkdir',
        }));
      });

      it('creates the migration file', function() {
        return cmd({}, function() {
          return actions['make-migration'](azulfile, {}, 'anotherOne');
        })
        .then(function(proc) {
          expect(proc.exitStatus).to.eql(0);
          expect(proc.exitCalled).to.eql(false);
          expect(proc.stdout).to.match(/\d{14}_another_one.js/i);
          expect(fs.writeFileSync).to.have.been.calledOnce;
          expect(fs.writeFileSync.getCall(0).args[0])
            .to.match(/migrations\/\d{14}_another_one\.js/);
        });
      });
    });

    describe('when the directory is not writable', function() {
      beforeEach(function() {
        fs.mkdirSync.restore();
        var error = new Error('EACCES, permission denied \'migrations\'');
        sinon.stub(fs, 'mkdirSync').throws(_.extend(error, {
          errno: 47,
          code: 'EACCES',
          path: 'migrations',
          syscall: 'mkdir',
        }));
      });

      it('fails', function() {
        return cmd({}, function() {
          return actions['make-migration'](azulfile, {}, 'anotherOne');
        })
        .throw(new Error('Expected call to fail.'))
        .catch(function(e) {
          expect(e.message).to.match(/EACCES/);
        });
      });
    });
  });

  describe('migrate action', function() {
    it('performs a schema migration', function() {
      return cmd({}, function() {
        return actions.migrate(azulfile, { migrations: migrations });
      })
      .then(function(proc) {
        expect(proc.exitStatus).to.eql(0);
        expect(proc.exitCalled).to.eql(false);
        expect(proc.stdout).to.match(/batch 1/i);
        expect(proc.stdout).to.match(/20141022202234_create_articles/i);
        expect(proc.stdout).to.match(/20141022202634_create_comments/i);
      });
    });

    it('fails schema migration when directory is missing', function() {
      return cmd({}, function() {
        return actions.migrate(azulfile, { migrations: './missing-dir' });
      })
      .then(function(proc) {
        expect(proc.exitStatus).to.eql(1);
        expect(proc.exitCalled).to.eql(true);
        expect(proc.stderr).to.match(/failed.*ENOENT.*missing-dir/i);
      });
    });

    describe('with executed migrations stubbed', function() {
      beforeEach(function() {
        adapter.respondToMigrations([
          '20141022202234_create_articles',
          '20141022202634_create_comments',
        ]);
      });

      it('displays a up-to-date message because there is nothing to migrate', function() {
        return cmd({}, function() {
          return actions.migrate(azulfile, { migrations: migrations });
        })
        .then(function(proc) {
          expect(proc.exitStatus).to.eql(0);
          expect(proc.exitCalled).to.eql(false);
          expect(proc.stdout).to.match(/up-to-date/i);
        });
      });
    });
  });

  describe('rollback action', function() {

    describe('with executed migrations stubbed', function() {
      beforeEach(function() {
        adapter.respondToMigrations([
          '20141022202234_create_articles',
          '20141022202634_create_comments',
        ]);
      });

      it('performs a schema rollback', function() {
        return cmd({}, function() {
          return actions.rollback(azulfile, { migrations: migrations });
        })
        .then(function(proc) {
          expect(proc.exitStatus).to.eql(0);
          expect(proc.exitCalled).to.eql(false);
          expect(proc.stdout).to.match(/batch 1/i);
          expect(proc.stdout).to.match(/20141022202234_create_articles/i);
          expect(proc.stdout).to.match(/20141022202634_create_comments/i);
        });
      });

      it('fails schema rollback when directory is missing', function() {
        return cmd({}, function() {
          return actions.rollback(azulfile, { migrations: './missing-dir' });
        })
        .then(function(proc) {
          expect(proc.exitStatus).to.eql(1);
          expect(proc.exitCalled).to.eql(true);
          expect(proc.stderr).to.match(/cannot find module.*missing-dir/i);
        });
      });
    });

    it('displays a message because there is nothing to rollback', function() {
        return cmd({}, function() {
          return actions.rollback(azulfile, { migrations: migrations });
        })
        .then(function(proc) {
          expect(proc.exitStatus).to.eql(0);
          expect(proc.exitCalled).to.eql(false);
          expect(proc.stdout).to.match(/nothing to rollback/i);
        });
    });

  });

}));
