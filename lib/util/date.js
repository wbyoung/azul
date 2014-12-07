'use strict';

var util = require('util');

/**
 * This converts days of the week, and/or their abbreviated names, to
 * numerical representations between 0 and 6, starting with Sunday and
 * ending with Saturday.
 *
 *     parseWeekdayToInt('Sunday'); // => 0
 *
 * @function parseWeekdayToInt
 * @param {String} weekday The full, or abbreviate, name of a day of the week.
 * @returns {Integer} A numerical representation of the given day of the week.
 */
module.exports.parseWeekdayToInt = function(weekday) {
  var result;
  if (weekday.match(/^sun(?:day)?$/i)) { result = 0; }
  else if (weekday.match(/^mon(?:day)?$/i)) { result = 1; }
  else if (weekday.match(/^tues(?:day)?$/i)) { result = 2; }
  else if (weekday.match(/^wed(?:nesday)?$/i)) { result = 3; }
  else if (weekday.match(/^thurs(?:day)?$/i)) { result = 4; }
  else if (weekday.match(/^fri(?:day)?$/i)) { result = 5; }
  else if (weekday.match(/^sat(?:urday)?$/i)) { result = 6; }
  else { throw new Error(util.format('Invalid weekday: %s', weekday)); }

  return result;
};
