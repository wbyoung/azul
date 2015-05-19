'use strict';

exports.up = function(schema) {
  schema.createTable('articles', function(table) {
    table.serial('id').primaryKey();
    table.string('title');
    table.string('author');
  });
  schema.alterTable('articles', function(table) {
    table.drop('author');
    table.text('body');
  });
};

exports.down = function(schema) {
  schema.dropTable('articles');
};
