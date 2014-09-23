'use strict';

var gulp = require('gulp');
var through = require('through2');
var OrderedStreams = require('ordered-read-streams');
var $ = require('gulp-load-plugins')();


/*
 * Path reference
 */

var paths = (function() {
  var table = {
    'src.project.scripts': ['./*.js'],
    'src.scripts': ['lib/**/*.js'],
    'src.tests': ['test/**/*.js'],
    'src.tests.fixtures': ['test/fixtures/**/*.json']
  };

  return function(name) {
    var result = table[name];
    if (!result) { throw new Error('Could not find path for ' + name); }
    return result;
  };
})();


/*
 * Configurable Tasks
 */

var tasks = {};

tasks['.watch'] = function() {
  gulp.watch([].concat(
    paths('src.scripts'),
    paths('src.tests.fixtures'),
    paths('src.tests')), ['lint', '.test:re-run']);
  gulp.watch(paths('src.project.scripts'), ['lint']);
};

tasks['.test'] = function(options) {
  var opts = options || {};

  var dependencies = [];
  var clearSources = function() {
    return through.obj(function(file, enc, cb) { cb(); });
  };

  if (opts.coverage) {
    dependencies.push(gulp.src(paths('src.scripts'))
      .pipe($.istanbul())
      .pipe(clearSources()));
  }

  // all other dependencies must finish before test files are added
  dependencies.push(gulp.src(paths('src.tests')));

  var stream = new OrderedStreams(dependencies)
    .pipe($.plumber())
    .pipe($.mocha({ reporter: 'dot' }));

  if (opts.coverage) {
    stream = stream.pipe($.istanbul.writeReports({
      dir: './coverage',
      reporters: [ 'html', 'json' ]
    }));
  }

  return stream;
};


/*
 * Private Tasks
 */

gulp.task('.watch', function() {
  return tasks['.watch']();
});

gulp.task('.test', ['.watch'], function() {
  return tasks['.test']();
});

gulp.task('.test:coverage', function() {
  return tasks['.test']({ coverage: true });
});

gulp.task('.test:re-run', function() {
  return tasks['.test']();
});


/*
 * Public Tasks
 */

gulp.task('default', ['test']);

gulp.task('test', ['clean'], function() {
  gulp.start('lint', '.test');
});

gulp.task('test:coverage', ['clean'], function() {
  gulp.start('lint', '.test:coverage');
});


gulp.task('lint', function() {
  var src = [].concat(
    paths('src.project.scripts'),
    paths('src.scripts'),
    paths('src.tests'));
  return gulp.src(src)
    .pipe($.cached('linting'))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('clean', function() {
  // perhaps clean docs & test coverage
});
