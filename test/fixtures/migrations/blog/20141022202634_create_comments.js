'use strict';

exports.up = function(schema) {
  return schema.createTable('comments', function(table) {
    table.serial('identifier').primaryKey();
    table.string('email');
    table.text('body');
    table.integer('article_id').references('articles.id');
  });
};

exports.down = function(schema) {
  return schema.dropTable('comments');
};
