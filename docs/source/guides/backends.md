---
title: Backends
toc: true
template: guide-page.html
---

# Backends

## PostgreSQL

All features are known to work with PostgreSQL.

### `Query#returning(column)`

An additional query method, `returning` can be used to return a specific value
from [insert queries][azul-queries#insert]. This method is only fully supported
in PostgreSQL.

## MySQL

All features are known to work with MySQL.

### `Query#returning(column)`

Using MySQL, the only value that can be returned is the auto-incremented
primary key. Requesting any other value will result in undefined behavior.

## SQLite3

There are a few features that are currently not supported in SQLite3. If you'd
like to see these improved, please open [an issue][azul-issues] or send over a
[pull request][azul-pulls] with support.

### `Query#returning(column)`

Using SQLite3, the only value that can be returned is the primary key if it is
aliased to the [`ROWID`][sqlite-autoinc]. Requesting any other value will
result in undefined behavior.

### Lookups

The following lookups are unsupported without
[an extension][node-sqlite-extension] that adds a
[SQL function][sqlite-functions]:

- `regex` and `iregex` require a `REGEXP(pattern, value)` function
- `year` requires a `YEAR(date)` function
- `month` requires a `MONTH(date)` function
- `day` requires a `DAY(date)` function
- `weekday` requires a `WEEKDAY(date)` function
- `hour` requires a `HOUR(date)` function
- `minute` requires a `MINUTE(date)` function
- `second` requires a `SECOND(date)` function

### `date`

SQLite3 stores `date` as a number &amp; Azul.js does not currently support
distinguishing this type in any way. Data will always be read from the database
as numbers even if a date was used to store the value.

One way around this is to use [properties][azul-core#properties] to convert
the value as it comes back from the database:

```js
var property = azul.Core.property;

var Article = db.model('article', {
  publishedValue: db.attr('published'),
  published: property(function() {
    return new Date(this.publishedValue);
  }, function(value) {
    this.publishedValue = value.getTime();
  })
});

var article = Article.create({ published: new Date() });
```

### `time`

SQLite3 stores `time` as a number &amp; Azul.js does not currently support
distinguishing this type in any way. Data will always be read from the database
as numbers even if a date was used to store the value. See the example in the
[section above](#sqlite3-date).

### `dateTime`

SQLite3 stores `dateTime` as a number &amp; Azul.js does not currently support
distinguishing this type in any way. Data will always be read from the database
as numbers even if a date was used to store the value. See the example in the
[section above](#sqlite3-date).


[azul-issues]: https://github.com/wbyoung/azul/issues
[azul-pulls]: https://github.com/wbyoung/azul/pulls
[azul-core#properties]: /guides/core/#objects-extending-classes-properties
[azul-queries#insert]: /guides/queries/#data-queries-insert
[sqlite-autoinc]: https://www.sqlite.org/autoinc.html
[sqlite-functions]: https://www.sqlite.org/c3ref/create_function.html
[node-sqlite-extension]: https://github.com/mapbox/node-sqlite3/wiki/Extensions
