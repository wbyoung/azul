'use strict';

var chai = require('chai');
var expect = chai.expect;
var _ = require('lodash');

var date = require('../../lib/util/date');

describe('date', function() {

  it('converts weekdays to numbers', function() {
    expect([
      'sunday', 'sun',
      'monday', 'mon',
      'tuesday', 'tues',
      'wednesday', 'wed',
      'thursday', 'thurs',
      'friday', 'fri',
      'saturday', 'sat'
    ].map(date.parseWeekdayToInt)).to.eql([
      0, 0,
      1, 1,
      2, 2,
      3, 3,
      4, 4,
      5, 5,
      6, 6
    ]);
  });
});
