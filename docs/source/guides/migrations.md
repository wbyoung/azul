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
  schema.createTable('articles', function(table) {
    table.serial('id').primaryKey();
    table.string('title');
    table.text('body');
  });
};

exports.down = function(schema) {
  schema.dropTable('articles');
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

Migrations support two modes of execution, _sequential_ and _manual_. The
examples given above are sequential. Each schema change will be executed
in the order they are written. In this mode, you cannot write asynchronous code
(no callbacks or promises). You therefore cannot obtain the results of any
queries. If you need full control, _manual_ mode can be enabled by simply
returning a promise or _thenable_ from the from the `up` or `down` function. In
manual mode, you are responsible for executing all queries in your migration.

### Methods

#### `#createTable`

Create new tables. Pass the name of the table you want to create and a callback
that will receive a table object with which you will be able to create columns
of different [field types](#migration-basics-field-types).

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

Alter existing tables. Pass the name of the table you want to alter and a
callback that will receive a table object with which you will be able to
create columns of different [field types](#migration-basics-field-types) as
well as drop existing columns.

```js
schema.alterTable('articles', function(table) {
  table.string('title'); // add a title column
  table.drop('body'); // drop the body column
});
```

- `drop` Drops a table column

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

_Quirks in [SQLite3][azul-backends#sqlite-date]._

#### `time`

A time type that does not include a date.

_Quirks in [SQLite3][azul-backends#sqlite-time]._

#### `dateTime`

A date and type type. Sometimes also known as a _timestamp_, this may or may
not use a _timestamp_ type depending on the database back-end, but will contain
both the date and time components of a date.

_Quirks in [SQLite3][azul-backends#sqlite-datetime]._

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

### Field Options

Options are enabled by chaining any of the following methods onto the end of
the field definition as shown in
[the create table example](#migration-basics-methods--createtable-).

#### `primaryKey`

Mark this column as being a primary key column.

#### `pk`

Alias of [`primaryKey`](#migration-basics-field-options--primarykey-).

#### `notNull`

Mark this column as not accepting null values.

#### `unique`

Mark this column as containing unique values.


#### `default`

Set the default value for this column.

```js
table.string('name').default('Anonymous')
```

_Security Note:_ This method accepts only number and strings. Azul.js will
escape the value that's sent to it to prevent security vulnerabilities, but we
still recommend against sending user-input to this method.


#### `references`

Set the column that this column references.

```js
table.integer('article_id').references('articles.id')
```

[azul-backends#sqlite-date]: /guides/backends/#sqlite3--date-
[azul-backends#sqlite-time]: /guides/backends/#sqlite3--time-
[azul-backends#sqlite-datetime]: /guides/backends/#sqlite3--datetime-
[azul-relations#one-to-many]: /guides/relations/#types-of-relationships-one-to-many
[azul-queries#data-queries]: /guides/queries/#data-queries
