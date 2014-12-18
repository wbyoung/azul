
'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;

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
      rows: [{ id: 1, subject: 'CS 101' }, { id: 2, subject: 'History 101' }]
    });
    adapter.intercept(/select.*from "enrollments"/i, {
      fields: ['id', 'student_id', 'course_id', 'date'],
      rows: [{
        id: 1, 'student_id': 1, 'course_id': 1,
        date: new Date(2014, 12, 17)
      }, {
        id: 2, 'student_id': 1, 'course_id': 2,
        date: new Date(2014, 12, 16)
      }, {
        id: 3, 'student_id': 2, 'course_id': 1,
        date: new Date(2014, 12, 16)
      }]
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
          { id: 1, subject: 'CS 101' },
          { id: 2, subject: 'History 101' }
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
          { id: 1, subject: 'CS 101' },
          { id: 2, subject: 'History 101' }
        ]);
      })
      .done(done, done);
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
});
