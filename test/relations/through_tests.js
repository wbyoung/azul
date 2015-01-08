
'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));

var BluebirdPromise = require('bluebird');
var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');

require('../helpers/model');

var db,
  adapter,
  student,
  Student,
  course,
  Course,
  Enrollment;

describe('Model.hasMany :through', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var hasMany = db.hasMany;
    var belongsTo = db.belongsTo;
    var attr = db.attr;

    Student = db.model('student').reopen({
      name: attr(),
      enrollments: hasMany(),
      courses: hasMany({ through: 'enrollments' })
    });
    Course = db.model('course').reopen({
      subject: attr(),
      enrollments: hasMany(),
      students: hasMany({ through: 'enrollments' })
    });
    Enrollment = db.model('enrollment').reopen({
      date: attr(),
      student: belongsTo(),
      course: belongsTo()
    });
  });

  beforeEach(function() {
    adapter.intercept(/select.*from "students"/i, {
      fields: ['id', 'name'],
      rows: [{ id: 1, name: 'Whitney' }, { id: 2, name: 'Kristen' }]
    });
    adapter.intercept(/select.*from "students" where "id" = ?/i, {
      fields: ['id', 'name'],
      rows: [{ id: 1, name: 'Whitney' }]
    });
    adapter.intercept(/select.*from "courses"/i, {
      fields: ['id', 'subject'],
      rows: [{ id: 9, subject: 'CS 101' }, { id: 4, subject: 'History 101' }]
    });
    adapter.intercept(/select.*from "enrollments"/i, {
      fields: ['id', 'student_id', 'course_id', 'date'],
      rows: [{
        id: 1, 'student_id': 1, 'course_id': 9,
        date: new Date(2014, 12, 17)
      }, {
        id: 2, 'student_id': 1, 'course_id': 4,
        date: new Date(2014, 12, 16)
      }, {
        id: 3, 'student_id': 2, 'course_id': 9,
        date: new Date(2014, 12, 16)
      }]
    });
    adapter.intercept(/insert into "courses"/i, {
      fields: ['id'],
      rows: [{ id: 82 }]
    });
    adapter.intercept(/insert into "enrollments"/i, {
      fields: ['id'],
      rows: [{ id: 27 }]
    });
  });

  beforeEach(function() {
    student = Student.fresh({ id: 1, name: 'Whitney' });
  });

  it('has related methods', function() {
    expect(Student.__class__.prototype).to.have.ownProperty('courses');
    expect(student).to.have.property('courseObjects');
    expect(student).to.respondTo('createCourse');
    expect(student).to.respondTo('createCourse');
    expect(student).to.respondTo('addCourse');
    expect(student).to.respondTo('addCourses');
    expect(student).to.respondTo('removeCourse');
    expect(student).to.respondTo('removeCourses');
    expect(student).to.respondTo('clearCourses');
  });

  describe('definition', function() {
    it('calculates the correct inverse', function() {
      expect(student.coursesRelation.inverse).to.eql('students');
    });
  });

  describe('relation', function() {

    it('fetches related objects', function(done) {
      student.courseObjects.fetch().then(function(courses) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "courses".* FROM "courses" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "enrollments"."student_id" = ?', [1]]
        ]);
        expect(_.map(courses, 'attrs')).to.eql([
          { id: 9, subject: 'CS 101' },
          { id: 4, subject: 'History 101' }
        ]);
      })
      .done(done, done);
    });

    it('assumes a has-many to a join table', function(done) {
      db = Database.create({ adapter: adapter });

      var hasMany = db.hasMany;
      var belongsTo = db.belongsTo;

      Student = db.model('student').reopen({
        courses: hasMany({ through: 'enrollments' })
      });
      Course = db.model('course').reopen({
        students: hasMany({ through: 'enrollments' })
      });
      Enrollment = db.model('enrollment').reopen({
        student: belongsTo(),
        course: belongsTo()
      });

      student = Student.fresh({ id: 1, name: 'Whitney' });
      student.courseObjects.fetch().then(function(courses) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "courses".* FROM "courses" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "enrollments"."student_id" = ?', [1]]
        ]);
        expect(_.map(courses, 'attrs')).to.eql([
          { id: 9, subject: 'CS 101' },
          { id: 4, subject: 'History 101' }
        ]);
      })
      .done(done, done);
    });

    it('throws an error when it cannot find the source relation', function() {
      db = Database.create({ adapter: adapter });
      Student = db.model('student').reopen({
        courses: db.hasMany({ through: 'enrollments' })
      });
      Course = db.model('course').reopen({
        students: db.hasMany({ through: 'enrollments' })
      });
      Enrollment = db.model('enrollment');
      student = Student.fresh({ id: 6 });

      expect(function() {
        student.courseObjects.fetch();
      }).to.throw(/source.*enrollment#courses.*enrollment#course.*student#courses.*has-many/i);
    });

    it('throws an error when it cannot find a through relation', function() {
      db = Database.create({ adapter: adapter });
      Student = db.model('student').reopen({
        courses: db.hasMany({ through: 'enrollments', autoJoin: false })
      });
      student = Student.fresh({ id: 6 });
      expect(function() {
        student.courseObjects.fetch();
      }).to.throw(/through.*enrollments.*student#courses.*has-many/i);
    });

    it('allows source to be specified', function(done) {
      db = Database.create({ adapter: adapter });
      Student = db.model('student').reopen({
        enrollments: db.hasMany({ inverse: 'participant' }),
        workshops: db.hasMany('course', {
          through: 'enrollments',
          source: 'course'
        })
      });
      Course = db.model('course').reopen({
        students: db.hasMany({ through: 'enrollments', source: 'participant' })
      });
      Enrollment = db.model('enrollment').reopen({
        participant: db.belongsTo('student'),
        course: db.belongsTo()
      });

      student = Student.fresh({ id: 6 });
      course = Course.fresh({ id: 2 });

      BluebirdPromise.bind()
      .then(function() {
        return student.workshopObjects;
      })
      .then(function() {
        return course.studentObjects;
      })
      .then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "courses".* FROM "courses" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "enrollments"."participant_id" = ?', [6]],
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."participant_id" = "students"."id" ' +
           'WHERE "enrollments"."course_id" = ?', [2]]
        ]);
      })
      .done(done, done);
    });

    it('adds join table relation immediately', function() {
      db = Database.create({ adapter: adapter });
      Student = db.model('student').reopen({
        courses: db.hasMany({ through: 'enrollments' })
      });
      expect(Student.create().enrollmentsRelation).to.exist;
    });

    it('adds pluralized join table relation immediately', function() {
      db = Database.create({ adapter: adapter });
      Student = db.model('student').reopen({
        courses: db.hasMany({ through: 'enrollment' })
      });
      expect(Student.create().enrollmentsRelation).to.exist;
    });

    it('is aware of existing relations defined later in the same group', function() {
      db = Database.create({ adapter: adapter });
      Student = db.model('student').reopen({
        courses: db.hasMany({ through: 'enrollments' }),
        enrollments: db.hasMany()
      });
      expect(Student.create().enrollmentsRelation).to.exist;
    });

  });

  describe('helpers', function() {
    beforeEach(function() {
      sinon.spy(Enrollment.__metaclass__.prototype, 'create');
      sinon.spy(Enrollment.__metaclass__.prototype, 'new');
    });

    afterEach(function() {
      Enrollment.__metaclass__.prototype.create.restore();
      Enrollment.__metaclass__.prototype.new.restore();
    });

    it('allows create', function() {
      var course = student.createCourse({ subject: 'CS 101' });
      expect(course).to.to.be.an.instanceOf(Course.__class__);
    });

    it('does not create collection cache during create', function() {
      var course = student.createCourse({ subject: 'CS 101' });
      expect(function() {
        student.courses;
      }).to.throw(/courses.*not yet.*loaded/i);
      expect(course).to.exist;
    });

    it('does not create through collection cache during create', function() {
      var course = student.createCourse({ subject: 'CS 101' });

      expect(course.enrollments).to.eql([]); // course is new, gets cache
      expect(function() {
        student.enrollments;
      }).to.throw(/enrollments.*not yet.*loaded/i);
    });

    it('updates collection cache during create', function(done) {
      var course;
      student.courseObjects.fetch().then(function() {
        course = student.createCourse({ subject: 'CS 101' });
      })
      .then(function() {
        expect(student.courses).to.contain(course);
      })
      .done(done, done);
    });

    it('does not update through cache during create', function(done) {
      var course;
      student.courseObjects.fetch().then(function() {
        course = student.createCourse({ subject: 'CS 101' });
      })
      .then(function() {
        expect(course.enrollments).to.eql([]); // course is new, has cache
        expect(function() {
          student.enrollments;
        }).to.throw(/enrollments.*not yet.*loaded/i);
      })
      .done(done, done);
    });

    it('clears query cache during create', function() {
      var courseObjects = student.courseObjects;
      var course = student.createCourse({ subject: 'CS 101' });
      expect(student.courseObjects).to.not.equal(courseObjects);
      expect(course).to.exist;
    });

    it('does not create an instance of the join model during create', function() {
      expect(Enrollment.__metaclass__.prototype.create).to.not.have.been.called;
      expect(Enrollment.__metaclass__.prototype.new).to.not.have.been.called;
    });

    it('allows add with existing objects', function(done) {
      var course = Course.fresh({ id: 5, subject: 'CS 101' });
      student.addCourse(course).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['INSERT INTO "enrollments" ("student_id", "course_id") ' +
           'VALUES (?, ?)', [1, 5]]
        ]);
        expect(course).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('does not try to repeat addition updates', function(done) {
      var course = Course.fresh({ id: 5, subject: 'CS 101' });
      student.addCourse(course);
      student.save().then(function() {
        return student.save();
      })
      .then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['INSERT INTO "enrollments" ("student_id", "course_id") ' +
           'VALUES (?, ?)', [1, 5]]
        ]);
        expect(student.coursesRelation._getInFlightData(student)).to.eql({
          clear: false,
          add: [],
          remove: [],
        });
        expect(course).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows add with multiple existing objects', function(done) {
      var course1 = Course.fresh({ id: 5, subject: 'CS 101' });
      var course2 = Course.fresh({ id: 8, subject: 'CS 101' });
      student.addCourses(course1, course2).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['INSERT INTO "enrollments" ("student_id", "course_id") ' +
           'VALUES (?, ?), (?, ?)', [1, 5, 1, 8]]
        ]);
        expect(course1).to.have.property('dirty', false);
        expect(course2).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows add with unsaved objects', function(done) {
      var course = Course.fresh({ id: 12, subject: 'CS 101' });
      course.subject = 'Renamed';
      student.addCourse(course).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "courses" SET "subject" = ? ' +
           'WHERE "id" = ?', ['Renamed', 12]],
          ['INSERT INTO "enrollments" ("student_id", "course_id") ' +
           'VALUES (?, ?)', [1, 12]]
        ]);
        expect(course).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows add with created objects', function(done) {
      var course = Course.create({ subject: 'CS 101' });
      student.addCourse(course).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['INSERT INTO "courses" ("subject") VALUES (?) ' +
           'RETURNING "id"', ['CS 101']],
          ['INSERT INTO "enrollments" ("student_id", "course_id") ' +
           'VALUES (?, ?)', [1, 82]]
        ]);
        expect(course).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('updates collection cache during add', function(done) {
      var course = Course.fresh({ id: 5, subject: 'CS 101' });
      student.courseObjects.fetch().then(function() {
        return student.addCourse(course);
      })
      .then(function() {
        expect(_.last(student.courses)).to.eql(course);
      })
      .done(done, done);
    });

    it('clears query cache during add', function(done) {
      var course = Course.fresh({ id: 5, subject: 'CS 101' });
      var courseObjects = student.courseObjects;
      var chachedValues = [courseObjects];

      courseObjects.fetch()
      .then(function() { student.addCourse(course); })
      .then(function() {
        expect(chachedValues).to.not.contain(student.courseObjects);
        chachedValues.push(student.courseObjects);
      })
      .then(function() { return student.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(student.courseObjects);
      })
      .done(done, done);
    });

    it('does not create an instance of the join model during add', function(done) {
      var course = Course.fresh({ id: 5, subject: 'CS 101' });
      student.addCourse(course).then(function() {
        expect(Enrollment.__metaclass__.prototype.create).to.not.have.been.called;
        expect(Enrollment.__metaclass__.prototype.new).to.not.have.been.called;
      })
      .done(done, done);
    });

    it('allows remove with existing objects', function(done) {
      var course = Course.fresh({ id: 5, subject: 'CS 101', studentKey: student.id });
      student.removeCourse(course).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "enrollments" ' +
           'WHERE "student_id" = ? AND "course_id" = ?', [1, 5]]
        ]);
        expect(course).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('does not try to repeat removal updates', function(done) {
      var course = Course.fresh({ id: 5, subject: 'CS 101' });
      student.removeCourse(course);
      student.save().then(function() {
        return student.save();
      })
      .then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "enrollments" ' +
           'WHERE "student_id" = ? AND "course_id" = ?', [1, 5]]
        ]);
        expect(student.coursesRelation._getInFlightData(student)).to.eql({
          clear: false,
          add: [],
          remove: [],
        });
        expect(course).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows remove with multiple existing objects', function(done) {
      var course1 = Course.fresh({ id: 5, subject: 'CS 101' });
      var course2 = Course.fresh({ id: 8, subject: 'CS 101' });
      student.removeCourses(course1, course2).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "enrollments" ' +
           'WHERE "student_id" = ? AND "course_id" IN (?, ?)', [1, 5, 8]]
        ]);
        expect(course1).to.have.property('dirty', false);
        expect(course2).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows remove with unsaved objects', function(done) {
      var course = Course.fresh({ id: 12, subject: 'CS 101' });
      course.subject = 'Renamed';
      student.removeCourse(course).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "courses" SET "subject" = ? ' +
           'WHERE "id" = ?', ['Renamed', 12]],
          ['DELETE FROM "enrollments" ' +
           'WHERE "student_id" = ? AND "course_id" = ?', [1, 12]],
        ]);
        expect(course).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows remove with created objects', function(done) {
      var course = Course.create({ subject: 'CS 101' });
      student.removeCourse(course).then(function() {
        expect(adapter.executedSQL()).to.eql([
        ]);
        expect(course).to.have.property('persisted', false);
      })
      .done(done, done);
    });

    it('updates collection cache during remove', function(done) {
      var course;
      student.courseObjects.fetch().then(function() {
        course = student.courses[0];
        return student.removeCourse(course);
      })
      .then(function() {
        expect(student.courses).to.not.contain(course);
      })
      .done(done, done);
    });

    it('clears query cache during remove', function(done) {
      var courseObjects = student.courseObjects;
      var chachedValues = [courseObjects];

      courseObjects.fetch()
      .then(function() { student.removeCourse(student.courses[0]); })
      .then(function() {
        expect(chachedValues).to.not.contain(student.courseObjects);
        chachedValues.push(student.courseObjects);
      })
      .then(function() { return student.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(student.courseObjects);
      })
      .done(done, done);
    });

    it('does not create an instance of the join model during remove', function(done) {
      var course = Course.fresh({ id: 5, subject: 'CS 101', studentKey: student.id });
      student.removeCourse(course).then(function() {
        expect(Enrollment.__metaclass__.prototype.create).to.not.have.been.called;
        expect(Enrollment.__metaclass__.prototype.new).to.not.have.been.called;
      })
      .done(done, done);
    });

    it('allows clear', function(done) {
      student.clearCourses().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "enrollments" WHERE "student_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });

    it('updates collection cache during clear', function(done) {
      student.courseObjects.fetch().then(function() {
        return student.clearCourses();
      })
      .then(function() {
        expect(student.courses).to.eql([]);
      })
      .done(done, done);
    });

    it('clears query cache during clear', function(done) {
      var courseObjects = student.courseObjects;
      var chachedValues = [courseObjects];

      courseObjects.fetch()
      .then(function() { student.clearCourses(); })
      .then(function() {
        expect(chachedValues).to.not.contain(student.courseObjects);
        chachedValues.push(student.courseObjects);
      })
      .then(function() { return student.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(student.courseObjects);
      })
      .done(done, done);
    });

    it('does not clear query cache during save', function(done) {
      var courseObjects = student.courseObjects;
      student.save().then(function() {
        expect(courseObjects).to.equal(student.courseObjects);
      })
      .done(done, done);
    });

    it('does not create an instance of the join model during clear', function(done) {
      student.clearCourses().then(function() {
        expect(Enrollment.__metaclass__.prototype.create).to.not.have.been.called;
        expect(Enrollment.__metaclass__.prototype.new).to.not.have.been.called;
      })
      .done(done, done);
    });

    it('processes a complex sequence using add, remove, and clear', function(done) {
      var course1 = Course.fresh({ id: 1, subject: '#1' });
      var course2 = Course.fresh({ id: 2, subject: '#2' });
      var course3 = Course.fresh({ id: 3, subject: '#3' });
      var course4 = Course.fresh({ id: 4, subject: '#4' });
      var course5 = Course.fresh({ id: 5, subject: '#5' });
      var course6 = Course.fresh({ id: 6, subject: '#6' });
      var course7 = Course.fresh({ id: 7, subject: '#7' });

      student.addCourses(course1, course2, course3, course7);
      student.removeCourse(course1);
      student.addCourses(course4);
      student.clearCourses(); // clear makes nothing above matter
      student.addCourse(course1);
      student.addCourses(course6, course7);
      student.removeCourses(course2, course5, course1, course4);
      student.addCourse(course2);
      student.removeCourses(course6);
      student.addCourse(course2);

      student.save().then(function() {
        var executed = adapter.executedSQL();
        var clear = executed[0];
        expect(clear).to.eql(
          ['DELETE FROM "enrollments" WHERE "student_id" = ?', [1]]);
        // the order is not guaranteed between add & remove so they are sorted
        // based on the first argument (the argument corresponding to
        // SET "student_id" = ?)
        var remaining = executed.slice(1).sort(function(sql) {
          var args = sql[1];
          return args[0] === undefined;
        });
        expect(remaining).to.eql([
          ['INSERT INTO "enrollments" ("student_id", "course_id") ' +
           'VALUES (?, ?), (?, ?)', [1, 7, 1, 2]],
          ['DELETE FROM "enrollments" ' +
           'WHERE "student_id" = ? AND "course_id" IN (?, ?)', [1, 5, 4]]
        ]);
      })
      .done(done, done);
    });
  });

  describe('joins', function() {
    it('generates simple join queries', function(done) {
      Student.objects.join('courses').fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id"', []]
        ]);
      })
      .done(done, done);
    });

    it('generates join queries that use where accessing fields in both types', function(done) {
      Student.objects.join('courses').where({
        name: 'wbyoung',
        'subject[contains]': 'News'
      }).fetch().then(function() {
        // note that this expectation depends on ordering of object
        // properties which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "students"."name" = ? ' +
           'AND "courses"."subject" LIKE ?', ['wbyoung', '%News%']]
        ]);
      })
      .done(done, done);
    });

    it('defaults to the main model on ambiguous property', function(done) {
      Student.objects.join('courses').where({ id: 5 })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "students"."id" = ?', [5]]
        ]);
      })
      .done(done, done);
    });

    it('gives an error when there is an ambiguous property in two joins', function() {
      var Homework = db.model('homework');
      Homework.reopen({ subject: db.attr() });
      Student.reopen({ homeworks: db.hasMany('homework') });

      var query = Student.objects
        .join('courses')
        .join('homeworks')
        .where({ subject: 'Azul Course/Azul Blog' });

      expect(function() {
        query.sql();
      }).to.throw(/ambiguous.*"subject".*"(courses|homeworks)".*"(courses|homeworks)"/i);
    });

    it('resolves fields specified by relation name', function(done) {
      Student.objects.join('courses').where({ 'courses.id': 5, })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "courses"."id" = ?', [5]]
        ]);
      })
      .done(done, done);
    });

    it('resolves the relation name when the attribute is not defined', function(done) {
      Student.objects.join('courses').where({ 'courses.dbonly_field': 5, })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "courses"."dbonly_field" = ?', [5]]
        ]);
      })
      .done(done, done);
    });

    it('resolves fields specified by relation name & attr name', function(done) {
      Student.objects.join('courses').where({ 'courses.pk': 5, })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "courses"."id" = ?', [5]]
        ]);
      })
      .done(done, done);
    });

    it('automatically determines joins from conditions', function(done) {
      Student.objects.where({ 'courses.subject': 'News', })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "courses"."subject" = ? ' +
           'GROUP BY "students"."id"', ['News']]
        ]);
      })
      .done(done, done);
    });

    it('automatically determines joins from order by', function(done) {
      Student.objects.orderBy('-courses.pk')
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'GROUP BY "students"."id" ' +
           'ORDER BY "courses"."id" DESC', []]
        ]);
      })
      .done(done, done);
    });

    it('handles attrs during automatic joining', function(done) {
      Student.objects.where({ 'courses.pk': 5, })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "courses"."id" = ? ' +
           'GROUP BY "students"."id"', [5]]
        ]);
      })
      .done(done, done);
    });

    it('does not automatically join based on attributes', function(done) {
      Student.objects.where({ 'name': 'wbyoung', })
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "students" ' +
           'WHERE "name" = ?', ['wbyoung']]
        ]);
      })
      .done(done, done);
    });

    it('works with a complex query', function(done) {
      Student.objects.where({ 'courses.subject[contains]': 'news', })
      .orderBy('name', '-courses.subject')
      .limit(10)
      .offset(20)
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'WHERE "courses"."subject" LIKE ? ' +
           'GROUP BY "students"."id" ' +
           'ORDER BY "students"."name" ASC, "courses"."subject" DESC ' +
           'LIMIT 10 OFFSET 20', ['%news%']]
        ]);
      })
      .done(done, done);
    });

    it('joins & orders across multiple relationships', function(done) {
      var Comment = db.model('comment');
      Comment.reopen({ body: db.attr() });
      Course.reopen({ comments: db.hasMany() });
      Student.objects.where({ 'courses.comments.body[contains]': 'rolex', })
      .orderBy('name', 'courses.comments.body')
      .limit(10)
      .offset(20)
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "students".* FROM "students" ' +
           'INNER JOIN "enrollments" ' +
           'ON "enrollments"."student_id" = "students"."id" ' +
           'INNER JOIN "courses" ' +
           'ON "enrollments"."course_id" = "courses"."id" ' +
           'INNER JOIN "comments" ON "comments"."course_id" = "courses"."id" ' +
           'WHERE "comments"."body" LIKE ? ' +
           'GROUP BY "students"."id" ' +
           'ORDER BY "students"."name" ASC, "comments"."body" ASC ' +
           'LIMIT 10 OFFSET 20', ['%rolex%']]
        ]);
      })
      .done(done, done);
    });

    it('gives a useful error when second bad relation is used for `join`', function() {
      expect(function() {
        Student.objects.join('courses.streets');
      }).to.throw(/no relation.*"streets".*join.*student query.*courses/i);
    });
  });

  describe('pre-fetch', function() {
    it('cannot pre-fetch directly', function() {
      var relation = student.coursesRelation;
      expect(function() {
        relation.prefetch([]);
      }).to.throw(/cannot pre-?fetch.*through/i);
    });

    it('executes multiple queries', function(done) {
      Student.objects.with('courses').fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "students"', []],
          ['SELECT * FROM "enrollments" WHERE "student_id" IN (?, ?)', [1, 2]],
          ['SELECT * FROM "courses" WHERE "id" IN (?, ?) LIMIT 2', [9, 4]]
        ]);
      })
      .done(done, done);
    });

    it('executes the minimal number of queries', function(done) {
      Student.objects.with('enrollments.course', 'courses')
      .fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "students"', []],
          ['SELECT * FROM "enrollments" WHERE "student_id" IN (?, ?)', [1, 2]],
          ['SELECT * FROM "courses" WHERE "id" IN (?, ?) LIMIT 2', [9, 4]]
        ]);
      })
      .done(done, done);
    });

    it('does not cache related objects that it went through', function(done) {
      Student.objects.with('courses').fetch().get('0').then(function(foundStudent) {
        expect(foundStudent.id).to.eql(1);
        expect(foundStudent.name).to.eql('Whitney');
        expect(function() {
          foundStudent.enrollments;
        }).to.throw(/enrollments.*not yet.*loaded/i);
      })
      .done(done, done);
    });

    it('caches related objects', function(done) {
      Student.objects.with('courses').fetch().get('0').then(function(foundStudent) {
        expect(foundStudent.id).to.eql(1);
        expect(foundStudent.name).to.eql('Whitney');
        expect(_.map(foundStudent.courses, 'attrs')).to.eql([
          { id: 9, subject: 'CS 101' },
          { id: 4, subject: 'History 101' },
        ]);
      })
      .done(done, done);
    });

    it('caches related objects of all pre-fetches', function(done) {
      Student.objects.with('enrollments.course', 'courses')
      .fetch().get('0').then(function(foundStudent) {
        expect(foundStudent.id).to.eql(1);
        expect(foundStudent.name).to.eql('Whitney');
        expect(_(foundStudent.enrollments).map('course').map('attrs').value())
        .to.eql([
          { id: 9, subject: 'CS 101' },
          { id: 4, subject: 'History 101' },
        ]);
        expect(_.map(foundStudent.courses, 'attrs')).to.eql([
          { id: 9, subject: 'CS 101' },
          { id: 4, subject: 'History 101' },
        ]);
      })
      .done(done, done);
    });

    it('works with multiple models each having multiple related objects', function(done) {
      var studentsRegex = /select.*from "students".*order by "id"/i;
      var enrollmentsRegex =
        /select.*from "enrollments" where "student_id" in \(\?, \?, \?\)/i;
      var coursesRegex =
        /select.*from "courses" where "id" in \(\?, \?, \?, \?, \?, \?\)/i;
      adapter.intercept(studentsRegex, {
        fields: ['id', 'name'],
        rows: [
          { id: 1, name: 'Whitney' },
          { id: 2, name: 'Kate' },
          { id: 4, name: 'Sam' },
        ]
      });
      adapter.intercept(enrollmentsRegex, {
        fields: ['student_id', 'course_id'],
        rows: [
          { 'student_id': 1, 'course_id': 3 },
          { 'student_id': 1, 'course_id': 5 },
          { 'student_id': 2, 'course_id': 9 },
          { 'student_id': 2, 'course_id': 3 },
          { 'student_id': 2, 'course_id': 8 },
          { 'student_id': 2, 'course_id': 4 },
          { 'student_id': 4, 'course_id': 6 },
        ]
      });
      adapter.intercept(coursesRegex, {
        fields: ['id', 'subject'],
        rows: [
          { id: 3, subject: 'CS 101' },
          { id: 5, subject: 'Art History 101' },
          { id: 9, subject: 'Roman Literature 101' },
          { id: 8, subject: 'Calculus 101' },
          { id: 4, subject: 'Spanish 101' },
          { id: 6, subject: 'Chemistry 101' },
        ]
      });

      Student.objects.with('courses').orderBy('id').fetch().then(function(students) {
        expect(students[0].name).to.eql('Whitney');
        expect(students[1].name).to.eql('Kate');
        expect(students[2].name).to.eql('Sam');
        expect(_.map(students[0].courses, 'subject')).to.eql([
          'CS 101', 'Art History 101'
        ]);
        expect(_.map(students[1].courses, 'subject')).to.eql([
          'Roman Literature 101', 'CS 101', 'Calculus 101', 'Spanish 101'
        ]);
        expect(_.map(students[2].courses, 'subject')).to.eql([
          'Chemistry 101'
        ]);
      })
      .done(done, done);
    });

    it('works when some the objects have an empty result set', function(done) {
      var studentsRegex = /select.*from "students".*order by "id"/i;
      var enrollmentsRegex =
        /select.*from "enrollments" where "student_id" in \(\?, \?, \?\)/i;
      var coursesRegex =
        /select.*from "courses" where "id" in \(\?, \?\)/i;
      adapter.intercept(studentsRegex, {
        fields: ['id', 'name'],
        rows: [
          { id: 1, name: 'Whitney' },
          { id: 2, name: 'Kate' },
          { id: 4, name: 'Sam' },
        ]
      });
      adapter.intercept(enrollmentsRegex, {
        fields: ['student_id', 'course_id'],
        rows: [
          { 'student_id': 1, 'course_id': 3 },
          { 'student_id': 1, 'course_id': 5 },
        ]
      });
      adapter.intercept(coursesRegex, {
        fields: ['id', 'subject'],
        rows: [
          { id: 3, subject: 'CS 101' },
          { id: 5, subject: 'Art History 101' }
        ]
      });

      Student.objects.with('courses').orderBy('id').fetch().then(function(students) {
        expect(students[0].name).to.eql('Whitney');
        expect(students[1].name).to.eql('Kate');
        expect(students[2].name).to.eql('Sam');
        expect(_.map(students[0].courses, 'subject')).to.eql([
          'CS 101', 'Art History 101'
        ]);
        expect(_.map(students[1].courses, 'subject')).to.eql([]);
        expect(_.map(students[2].courses, 'subject')).to.eql([]);
      })
      .done(done, done);
    });

    it('works when no objects are returned', function(done) {
      adapter.intercept(/select.*from "students"/i, {
        fields: ['id', 'subject', 'student_id'],
        rows: []
      });
      Student.objects.with('courses').fetch().then(function(courses) {
        expect(courses).to.eql([]);
      })
      .done(done, done);
    });

    it('works via `fetchOne`', function(done) {
      Student.objects.where({ id: 1 }).with('courses').fetchOne()
      .then(function(fetchedStudent) {
        expect(_.map(fetchedStudent.courses, 'attrs')).to.eql([
          { id: 9, subject: 'CS 101' },
          { id: 4, subject: 'History 101' },
        ]);
      })
      .done(done, done);
    });

    it('works via `find`', function(done) {
      Student.objects.with('courses').find(1).then(function(fetchedStudent) {
        expect(_.map(fetchedStudent.courses, 'attrs')).to.eql([
          { id: 9, subject: 'CS 101' },
          { id: 4, subject: 'History 101' },
        ]);
      })
      .done(done, done);
    });
  });

});
