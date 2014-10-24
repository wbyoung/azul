'use strict';

/**
 * This converts days of the week, and/or their abbreviated names, to
 * numerical representations between 0 and 6, starting with Sunday and
 * ending with Saturday.
 *
 *     parseWeekdayToInt('Sunday'); //=> 0
 *
 * @function parseWeekdayToInt
 * @param {String} weekday The full, or abbreviate, name of a day of the week.
 * @returns {Number} A numerical representation of the given day of the week.
 */
module.exports.parseWeekdayToInt = function(weekday) {
  if (weekday.match(/^sun(?:day)?$/i)) { weekday = 0; }
  else if (weekday.match(/^mon(?:day)?$/i)) { weekday = 1; }
  else if (weekday.match(/^tues(?:day)?$/i)) { weekday = 2; }
  else if (weekday.match(/^wed(?:nesday)?$/i)) { weekday = 3; }
  else if (weekday.match(/^thurs(?:day)?$/i)) { weekday = 4; }
  else if (weekday.match(/^fri(?:day)?$/i)) { weekday = 5; }
  else if (weekday.match(/^sat(?:urday)?$/i)) { weekday = 6; }
  return weekday;
};
