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

For examples of running multiple actions in a single migration, see the example
migrations discussed in the [relations
documentation][azul-relations#one-to-many].

Migrations are run inside of a transaction, so if any of the migrations in a
sequence of migrations fails, the entire group will be rolled back. This is
only true if your database supports transactions.

The `up` and `down` functions are provided with a second argument. A
[basic query][azul-queries#data-queries] object that you can use if you need to
execute raw SQL or perform schema changes that are not supported by Azul.js.

### Methods

#### `#createTable`

Create new tables. Pass the name of the table you want to create and a callback
that will receive a table object with which you will be able to create columns
of different [field types](#field-types).

```js
schema.createTable('articles', function(table) {
  table.serial('id').primaryKey();
  table.string('title');
  table.text('body');
});
```

Returns a _thenable_ [basic query][azul-queries#data-queries] with the
following chainable methods:

- `unlessExists` Will not create the table if it already exists.

```js
schema.createTable('articles', function(table) {
   /* ... */
}).unlessExists();
```

<div class="panel panel-info">
<div class="panel-heading">
  <span class="panel-title"><code>id</code> Column</span>
</div>
<div class="panel-body">
Currently every table you create will need to specify an <code>id</code>
column. We'll be adding a feature soon to make it part of the table by
default and a chainable method <code>withoutId</code> to stop the automatic
behavior. Please open <a href="https://github.com/wbyoung/azul/issues">an
issue</a> or pull request to see this happen sooner.
</div>
</div>

#### `#alterTable`

Alter existing tables. Pass the name of the table you want to alter and a callback
that will receive a table object with which you will be able to create columns
of different [field types](#field-types) as well as drop existing columns.

```js
schema.alterTable('articles', function(table) {
  table.string('title'); // add a title column
  table.drop('body'); // drop the body column
});
```

- `drop` Drops a table column (**not yet supported in SQLite3**)

```js
schema.alterTable('articles', function(table) {
  table.drop('title'); // drop the title column
});
```


#### `#dropTable`

Drop existing tables.

```js
schema.dropTable('articles');
```

Returns a _thenable_ [basic query][azul-queries#data-queries] with the
following chainable methods:

- `ifExists` Will only drop the table if it exists.


### Field Types

#### `serial`

Automatically incrementing integer type usually used for `id` primary key
columns.

You can also use one of the following aliases:

- `auto`
- `increments`

#### `integer`

Standard sized integer.

#### `integer64`

64 bit integer.

#### `string`

A string. Accepts a `length` option which defaults to `255`.

```js
table.string('title', { length: 80 });
```

#### `text`

Arbitrary length (long) text.

#### `binary`

Binary data.

#### `bool`

Boolean.

#### `date`

A date type that does not include a time.

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>date</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `time`

A time type that does not include a date.

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>time</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `dateTime`

A date and type type. Sometimes also known as a _timestamp_, this may or may
not use a _timestamp_ type depending on the database back-end, but will contain
both the date and time components of a date.

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>dateTime</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `float`

A floating point number.

#### `decimal`

A decimal type that accepts the options `precision` and `scale`.

```js
table.decimal('amount', { precision: 20, scale: 10 });
```

If using options, you must specify at least the precision. Different adapters
will handle options slightly differently. It is recommended to either omit both
the `precision` and the `scale` or provide both for most consistent results.


[azul-relations#one-to-many]: /guides/relations/#one-to-many
[azul-queries#data-queries]: /guides/queries/#data-queries
