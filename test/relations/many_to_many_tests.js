
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

describe('Model many-to-many', function() {
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


});
