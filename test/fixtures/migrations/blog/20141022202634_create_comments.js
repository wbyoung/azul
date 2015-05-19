'use strict';

exports.up = function(schema) {
  schema.createTable('comments', function(table) {
    table.serial('identifier').primaryKey();
    table.text('body');
    table.integer('article_id').references('articles.id');
  });
  schema.alterTable('comments', function(table) {
    table.string('email');
  });
};

exports.down = function(schema) {
  return schema.dropTable('comments');
};
