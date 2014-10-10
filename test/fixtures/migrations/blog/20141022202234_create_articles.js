'use strict';

exports.up = function(schema) {
  return schema.createTable('articles', function(table) {
    table.serial('id');
    table.string('title');
    table.text('body');
  });
};

exports.down = function(schema) {
  return schema.dropTable('articles');
};
