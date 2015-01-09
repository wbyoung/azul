---
title: Migrations
toc: true
active: guides
template: guide-page.html
---

# Migrations

## Command Line

The `azul` command line tool can be used both to quickly create migrations as
well as to run the migrations.

To create a new migration:

```bash
$ azul make-migration create-articles
```

The migration file will be empty. You'll fill it in with schema changes that
you want to make in this migration. Once completed, you can run your migrations
with the command line tool, and roll them back as needed.

```bash
$ azul migrate
$ azul rollback
```

## Migration Basics

Migrations are sequences of changes that are made to your database schema over
time. They allow a team of developers to work together more fluidly. Each
migration is applied in the order in which it was created. It is assumed that
once created and applied, that migrations do not change. That is, once you
commit a migration and push it, you should not change it. You should instead
create a new migration.

Azul.js migrations are simply modules that export two functions, an `up`
function and a `down` function. When you migrate your database schema forward,
you'll run `azul migrate` and the `up` will be run. When you migrate your
schema backward, you'll run `azul rollback` and the `down` function will be
run. It is expected that your `down` function reverse the changes that your up
function makes.

An example migration looks like this:

```js
exports.up = function(schema) {
  return schema.createTable('articles', function(table) {
    table.serial('id').primaryKey();
    table.string('title');
    table.text('body');
  });
};

exports.down = function(schema) {
  return schema.dropTable('articles');
};
```

Migrations are run inside of a transaction, so if any of the migrations in a
sequence of migrations fails, the entire group will be rolled back. This is
only true if your database supports transactions.

The `up` and `down` functions are provided with a second argument. A
[basic query][azul-queries#data-queries] object that you can use if you need to
execute raw SQL or perform schema changes that are not supported by Azul.js.

### Methods

#### `#createTable`

Content coming soon&hellip;

#### `#dropTable`

Content coming soon&hellip;

### Field Types

#### `auto`

#### `increments`

#### `serial`

#### `integer`

#### `integer64`

#### `string`

#### `text`

#### `binary`

#### `bool`

#### `date`

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>date</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `time`

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>time</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `dateTime`

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>dateTime</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `float`

#### `decimal`

[azul-queries#data-queries]: /guides/queries.html#data-queries
