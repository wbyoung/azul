---
title: Queries
toc: true
active: guides
template: guide-page.html
---

# Queries

Queries in Azul.js allow you to filter and fetch specific data from the
database.

## Basics

Queries are chainable, immutable, lazily evaluated objects that can be executed
and cache the execution result.

To discuss each of these concepts, let's first take a look at a simple query:

```js
var query = Article.objects
  .where({ 'title[contains]': 'Azul' })
  .order('-title')
  .limit(5);

query.fetch().then(function(articles) {
  // query has been executed in the database
});
```

### Chainability

Each method that is called on a query object will return a query object
allowing you to chain together the components of your query. In the example
above, `Article.objects` is a query object. Calling [`where`](#methods--where-)
returns a query object as well, allowing you to then call
[`order`](#methods--order-). Each subsequent call builds on the previous query.

### Immutability

All query methods will return a _new_ query object that includes the conditions
of the query object on which it was called plus the conditions dictated by the
call.

For instance, given the following code:

```js
var query = Article.objects;

query.where({ id: 5 });
query.where({ title: 'Azul' });
```

Each [`where`](#methods--where-) builds off of the original query object. The
first call only specifies to fetch articles where the `id` is `5`. The second
only specifies to fetch where the `title` is `Azul`. Neither call mutated the
`query` object. They created new objects.

If you need to build queries by altering a variable, you can re-assign that
variable:

```js
var query = Article.objects;

query = query.where({ id: 5 });
query = query.where({ title: 'Azul' });
```

### Laziness

Queries are not executed until execution is requested. To execute a query, you
must call [`execute`](#executing--execute-), [`fetch`](#executing--fetch-),
[`find`](#executing--find-), or [`then`](#executing--then-) on the object.

Lazy evaluation allows queries to be passed around to different parts of your
application without actually being executed until some condition is met.
Queries can be built and discarded with very little performance overhead.

### Caching

When a query is executed, the result will be cached so it can be re-used if
execution is requested again. This usually results in a desired performance
gain as your application will not need to re-request data from the database
when the result is already known. In some cases, however, you may need to force
a query to be re-executed. In that case, you can simply [clone the
query](#methods--clone-).

## Methods

The following methods are available on all queries for models. You can access
a query that contains no conditions via the [`objects`][azul-models#objects]
property of your model class. For more details and customization of this base
query, read about [managers][azul-managers].

### `#where`

Narrowing the scope of objects returned form the database is accomplished by
using the `where` method.

Simple queries can be achieved by simply passing an object with the conditions
that must be met:

```js
Article.objects.where({ title: 'Azul.js', body: '1.0 Released' });
```

This query will find all article objects where the title is _exactly_ equal to
`Azul.js` **and** the body is _exactly_ equal to `1.0 Released`.

Chaining where queries would produce the same result:

```js
Article.objects.where({ title: 'Azul.js' }).where({ body: '1.0 Released' });
```

Azul.js allows for the creation of complex queries, though, through
[lookups](#lookups) and [complex conditions](#complex-conditions).

- [Automatically joins](#relationships-automatic-joining) relationships

### `#limit`

Limit the number of results for a query.

```js
Article.objects.limit(8); // a maximum of 8 results will be returned
```

### `#offset`

Set the offset for a query.

```js
Article.objects.offset(2); // skip the first 2 results
```

### `#order`

Order the results of a query.

```js
// sort by title descending
Article.objects.order('-title');

// sort by title descending, then body ascending
Article.objects.order('-title', 'body');
```

- Can be used via the `orderBy` alias
- [Automatically joins](#relationships-automatic-joining) relationships

### `#groupBy`

Groups the results of a query.

```js
Article.objects.groupBy('title');
```

- [Automatically joins](#relationships-automatic-joining) relationships

<div class="panel panel-info">
<div class="panel-heading">
  <span class="panel-title">Coming Soon&hellip;</span>
</div>
<div class="panel-body">
More aggregation support is coming soon, which will make this method more
useful.
</div>
</div>

### `#unique`

Performs a [`groupBy`](#methods--groupby-) with the primary key of the model. This
is useful when [joining relations](#relationships--join-).


### `#clone`

Create a new query that has the exact same conditions as this query. This
method can be used to ensure that executing a query will not use a
[cached result](#basics-caching).

## Complex Conditions

Complex conditions can be created using `azul.w`. For instance, you would use
`w` to create an _OR_:

```js
Article.objects.where(w({ title: 'Azul' }, w.or, { title: 'Azul.js' }));
```

A few more examples should make the use of `w` objects clear. There is support
for _OR_, _NOT_, and _AND_ operators. When no operator is specified, an _AND_
is assumed.

```js
w({ id: 5 }, { title: 'Azul.js' }); // defaults to AND
w(w.not, { title: 'Azul' }); // a NOT condition

// a complex condition representing
// (first = "Whitney" OR first = "Whit") AND last = "Young"
var firstName = w({ first: 'Whitney' }, w.or, { first: 'Whit' });
var lastName = { last: 'Young' };
var fullCondition = w(firstName, w.and, lastName);
```

Conditions default to treating the left hand side as a field (column) name and
the right hand side as a value. If you need to write a query that uses a field
on the right hand side, you can use `azul.f` to ensure the database treats the
right hand side as a field and escapes it properly:

```js
w({ first: f('last') });
```

Similarlly, if you need to use a literal in the condition, you can do so with
`azul.l`:

```js
w({ first: l('CONCAT("last", "suffix")') });
```

The standard [SQL injection][sql-injection] warning applies when using `f` and
`l` to mark the right hand side of your query as a non-value.

## Lookups

Lookups allow an different types of operations to be performed in the database
while evaluating a condition. Each is specified after the property name within
square brackets (meaning you'll have to quote the property name). For instance,
using an _exact_ comparison on `id` would mean using a property name of
`id[exact]`. See the examples below for more detail.


### `exact`

An exact comparison. This is assumed if no lookup is specified.

```js
Article.objects.where({ 'title[exact]': 'Azul.js' });
```

### `iExact`

A case insensitive exact comparison.

```js
Article.objects.where({ 'title[iExact]': 'azul.js' });
```

### `contains`

A case-sensitive containment test.

```js
Article.objects.where({ 'title[contains]': 'Azul.js' });
```

### `iContains`

A case-insensitive containment test.

### `startsWith`

A case-sensitive starts-with.

### `iStartsWith`

A case-insensitive starts-with.

### `endsWith`

A case-sensitive ends-with.

### `iEndsWith`

A case-insensitive ends-with.

### `regex`

A case-sensitive regular expression test.

```js
Article.objects.where({ 'title[regex]': /[Aa]zul\.?js/ });
```

Regular expression flags are currently ignored, so the following will still be
case sensitive:

```js
// currently interpreted as case sensitive, but may change in the future
Article.objects.where({ 'title[regex]': /[Aa]zul\.?js/i });
```

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

### `iRegex`

A case-insensitive regular expression test.

```js
Article.objects.where({ 'title[iRegex]': /azul\.?js/i });
```

While regular expression flags are currently ignored, it is recommended that
you use a case insensitive flag on your regex for clarity.

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

### `between`

A test for a value being between two values (inclusive).

```js
Article.objects.where({ 'id[between]': [2, 8] });
```

This works for all types where `BETWEEN` works in your database.

### `in`

A test for a value being in an array of values.

```js
Article.objects.where({ 'title[in]': ['Azul.js', 'Azul'] });
```

### `gt`

Greater than.

```js
Article.objects.where({ 'id[gt]': 5 });
```

### `gte`

Greater than or equal to.

```js
Article.objects.where({ 'id[gte]': 5 });
```

### `lt`

Less than.

```js
Article.objects.where({ 'id[lt]': 5 });
```

### `lte`

Less than or equal to.

```js
Article.objects.where({ 'id[lte]': 5 });
```

### `isNull`

Test for `NULL` or `NOT NULL`.

```js
Article.objects.where({ 'id[isNull]': true });
Article.objects.where({ 'id[isNull]': false });
```

### `year`

Test for a specific year.

```js
Article.objects.where({ 'createdAt[year]': 2014 });
```

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

### `month`

Test for a specific month. (1 - 12)

```js
Article.objects.where({ 'createdAt[month]': 10 });
```

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

### `day`

Test for a specific day.

```js
Article.objects.where({ 'createdAt[day]': 7 });
```

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

### `weekday`

Test for a specific weekday.

```js
Article.objects.where({ 'createdAt[weekday]': 1 });
Article.objects.where({ 'createdAt[weekday]': 'mon' });
Article.objects.where({ 'createdAt[weekday]': 'monday' });
```

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

### `hour`

Test for a specific hour.

```js
Article.objects.where({ 'createdAt[hour]': 22 });
```

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

### `minute`

Test for a specific minute.

```js
Article.objects.where({ 'createdAt[minute]': 10 });
```

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

### `second`

Test for a specific second.

```js
Article.objects.where({ 'createdAt[second]': 54 });
```

_Requires extension in [SQLite3][azul-backends#sqlite-lookups]._

## Executing

### `#execute`

Executes a query. Once executed, subsequent calls will use the result from the
first execution. [Read the details in caching](#basics-caching).

```js
query.execute(function(results) {
  // execution complete
});
```

### `#fetch`

Essentially an alias for [`execute`](#executing--execute-), this method is
preferred in most cases for readability when reading data from the database.

```js
Article.objects.fetch().then(function() { /* ... */ }); // reads better
Article.objects.execute().then(function() { /* ... */ });
```

**Advanced:** For [data queries](#data-queries), this method actually ensures
that the resolved object is transformed to an array rather than a standard
result object.

### `#fetchOne`

This method fetches a single result. Like `fetch`, this method executes the
query. It will reject the promise with one of the following codes if a single
result is not found.

- `NO_RESULTS_FOUND`
- `MULTIPLE_RESULTS_FOUND`

To aid in debugging, the error object will also have the following properties
defined on it:

- `query` the query being executed
- `sql` the SQL of the query
- `args` the arguments bound to the SQL statement

### `#find`

Find is a shortcut method to find a single result by primary key:

```js
query.find(3);
query.where({ pk: 3 }).limit(1).fetchOne(); // the same
```

### `#findOrCreate`

Find or create is a shortcut method to use with models to find a single result
or create one if it does not exist:

```js
Article.objects.findOrCreate({ title: 'Azul.js 1.0' });
```

This is roughly the same as recovering from a failure if the object was not
found:

```js
Article.objects.where({ title: 'Azul.js 1.0' }).limit(1).fetchOne()
.catch(function(e) {
  if (e.code === 'NO_RESULTS_FOUND') {
    return Article.create({ title: 'Azul.js 1.0' });
  }
  else { throw e; }
});
```

You may also pass a second argument to this method, _defaults_ that will be
used if the object is created. For instance:

```js
Article.objects.findOrCreate({ title: 'Azul.js 1.0' }, { author: 'Whitney' });
```


### `#then`

Query objects are _thenable_ objects, meaning that you can return them inside
of a promise & they will be executed before the next promise handler.

```js
Article.objects.find(1).then(function(article) {
  return Comment.objects.where({ 'body[contains]': article.title });
})
.then(function(comments) {
  // all comments will have been found
});
```

The fact that queries are _thenable_ could be abused by omitting calls to
[`fetch`](#executing--fetch-) or [`execute`](#executing--execute-) in
non-promise handlers. For readability, this is strongly discouraged. And
returning explicitly executed queries inside of promise handlers is considered
acceptable:

```js
Article.objects.find(1).then(function(article) {
  return Comment.objects.where({ 'body[contains]': article.title }).fetch();
})
.then(function(comments) {
  // all comments will have been found
});
```

## Relationships

The discussion of query methods for [relationships][azul-relations] assumes the
following models have been defined:

```js
var Article = db.model('article', {
  title: db.attr(),
  body: db.attr(),
  comments: db.hasMany()
});

var Comment = db.model('comment', {
  name: db.attr(),
  spam: db.attr(),
  body: db.attr(),
  article: db.belongsTo()
});
```

### `#with`

Pre-fetch [related objects][azul-relations] to avoid executing _N + 1_ queries.

A poor implementation of fetching all articles and each of the article's
comments may look something like:

```js
// note: do not use this code

var processArticle = function(article) {
  article.commentObjects.fetch().then(function(comments) {
    // do something with this article's comments
  });
};

Article.objects.fetch().then(function(articles) {
  return Promise.map(articles, processArticle); // bluebird promises
});
```

While this code is a bit more complicated than code you'd write with other ORM
tools, it's still valuable to understand that at a certain level of
abstraction, these types of _N + 1_ queries may still pop up and surprise you.

What happens when executing these queries is that a `SELECT` statement is done
for all articles. If _N_ articles are returned, then we actually do _N_
additional `SELECT` queries for fetching comments. This can easily be optimized
to execute a single query to fetch the required comments.

Using `with` this bit of code becomes much simpler:

```js
Article.objects.with('comments').fetch().then(function(articles) {
  articles.forEach(function(article) {
    // comments are accessible since they have been pre-fetched
    article.comments;
  });
});
```

### `#join`

In certain cases, you may need to access data from two tables in order to form
a query.

For instance, finding articles that have a comment marked as spam. This query
will return duplicate articles if there are multiple comments marked as spam
for the article:

```js
Article.objects.join('comments').where({ spam: true });
```

To remove the duplicates from the results, either add
[`unique`](#methods--unique-) or use
[automatic joining](#relationships-automatic-joining).

```js
Article.objects.join('comments').where({ spam: true }).unique();
```

Azul.js will resolve names to the appropriate model when possible. In this
case, it is able to determine that `spam` is an attribute that's defined on the
`Comment` model and executes the appropriate database query. The properties
`id` and `body` are ambiguous, though, and must be qualified as `comments.id`
and `commens.body` if they refer to the joined association.

---

In many simple cases, [automatic joining](#relationships-automatic-joining)
will be simpler and will also ensure the results are
[`unique`](#methods--unique-).

In the above example, the `where` call could have automatically joined the
`comments` relation by specifying `comments.spam` rather than just `spam` in
the where condition, and the explicit join would not have been required. Read
more about [automatic joining](#relationships-automatic-joining) to understand
how this works.

The order of a manual vs automatic join will make a difference on whether or
not uniqueness is added to your query:

```js
// manual joined first, results are not unique (since join is first)
Article.objects.join('comments').where({ 'comments.spam': true });

// automatic joined first, unique results (since where is first)
Article.objects.where({ 'comments.spam': true }).join('comments');
```

### Automatic Joining

Most situations that require a [`join`](#relationships--join-) to occur between
relationships will be handled automatically. Automatic joining also ensures
uniqueness of results by automatically ensuring that
[`unique`](#methods--unique-) has been added to the query.

Methods that support automatic joining will use the attribute string to
determine if a relationship exists that can be joined.

The following queries would automatically add a join:

```js
Article.objects.where({ 'comments.spam': true });
Comment.objects.order('article.title');
```

The following methods support automatic joining:

- [`where`](#methods--where-)
- [`order`](#methods--order-)
- [`groupBy`](#methods--groupby-)

## Generic Queries

More generic queries, similar to [data queries](#data-queries), can actually be
used via models very easily as well. This allows for more specific queries to
be built conveniently using the models that you've already defined.

There are a few main differences between these and
[standard data queries](#data-queries):

1. These queries are aware of the model class & will provide model query features like [automatic joining](#relationships-automatic-joining).
1. The resulting data will always be an array.
1. The resulting data will be model objects for `all` and `raw` queries.
1. You do not provide a table name.

### `#all`

Create a [select query](#data-queries-select) bound to this model that
will transform the resulting data into model objects. The resulting query is
synonymous with the original, but can be used for style and clarity:

```js
Article.objects.fetch().then(function(models) { /**/ });
Article.objects.all().fetch().then(function(models) { /**/ });
```

### `#select`

Create a [select query](#data-queries-select) bound to this model that
_does not_ convert the resulting data into model objects.

```js
Article.objects.all().fetch().then(function(rows) {
  console.log(rows);
});
// ~> [ { id: 4, title: 'Breaking News' } ]
```

### `#insert`

Create an [insert query](#data-queries-insert) bound to this model.

```js
Article.objects.insert({ title: 'News' }).then(function(rows) {
  console.log(rows);
});
// -> insert into "articles" ("title") values (?) returning "id"
// !> ['News']
// ~> [ { id: 9 } ]
```

### `#update`

Create an [update query](#data-queries-update) bound to this model.

For instance, you could update a single attribute of a specific object in the
database:

```js
Article.objects.where({ pk: article.pk }).update({ title: 'Breaking News' });
// -> update "articles" set "title" = ? where "id" = ?
// !> ['Breaking News', 1]
```

### `#delete`

Create an [delete query](#data-queries-delete) bound to this model.

To delete multiple records in the database via one query:

```js
Comment.objects.where({ spam: true }).delete();
// -> delete from "comments" where "spam" = ?
// !> [true]
```

### `#raw`

Create a [raw query](#data-queries-raw) bound to this model that will transform the
resulting data into model objects.

Be very cautious of [SQL injection][sql-injection] when using raw queries.

Sometimes you may need to execute raw SQL queries. While this is discouraged,
it can still be done. Raw queries on models are expected to be `SELECT`
queries. For other types of SQL queries, use [data queries](#data-queries).

```js
var query = Article.objects
  .raw('SELECT * FROM "articles" WHERE "id" = ?', [1]);

query.fetch().then(function(articles) {
  // articles is still an array of article objects
});
```

## Data Queries

At times, it may be useful to execute more basic queries. Azul.js provides
_data queries_ that return simple data rather than model objects.

Most of the methods available on these queries work the same way they do when
used through a model class.

All queries require a call to [`execute`](#executing--execute-) and are
_thenable_ objects. When executed, the resulting promise will resolve with an
object that will contain at the very least a `rows` key. The value of this key
will be an array of objects that have been read from the database. Additional
data may be available depending on the database back-end.

```js
db.select('people').then(function(data) {
  console.log(data.rows);
});
```

Data queries are not aware of models and will not convert camel case property
names into underscore case. They will not automatically join relationships.

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQL</span></div>
<div class="panel-body">
The example queries below show how to use these basic queries as well as the
approximate SQL that each query will produce. The exact SQL will vary by
database back-end.
</div>
</div>


### Select

Select queries can be executed via `db.select` or `db.query.select`.

```js
db.select('people')
// -> select * from people

db.select('people', ['firstName', 'lastName'])
// -> select firstName, lastName from people
```

Chainable methods include:

- `where` Will not convert property names or join relationships. See
[`#where`](#methods--where-).
- `order` Will not convert property names or join relationships. See
[`#order`](#methods--order-).
- `limit` No differences. See [`#limit`](#methods--limit-).
- `offset` No differences. See [`#offset`](#methods--offset-).
- `join`  Joins are quite different as they require more information than
simply a relationship name. Joins default to an `INNER` join. See more examples
below.
- `groupBy` Will not convert property names or join relationships. See
[`#groupBy`](#methods--groupby-).
- `fetch` Executes the query and returns a promise that resolves with the
`rows` from the result. See [`#fetch`](#executing--fetch-).
- `fetchOne` No differences. See [`#fetchOne`](#executing--fetchone-).


**Joins**

```js
db.select('cities', ['cities.name', 'countries.name'])
  .join('countries', 'cities.country_id=countries.id');
// -> select cities.name, countries.name from cities
// -> inner join countries on cities.country_id = countries.id

db.select('cities')
  .join('countries', 'left', { 'cities.country_id': f('countries.id') })
  .where({ 'cities.name[icontains]': 'city' })
// -> select * from cities
// -> left join countries on cities.country_id = countries.id
// -> where cities.name ilike ?
// !> ['%city%']
```

### Insert

Insert queries can be executed via `db.insert` or `db.query.insert`.

```js
db.insert('users').values({ name: 'Whitney' })
// -> insert into "users" ("name") values (?)
// !> ['Whitney']

db.insert('users').values({ name: 'Whitney' }, { name: 'Sara' })
// -> insert into "users" ("name") values (?), (?)
// !> ['Whitney', 'Sara']

db.insert('users').values([{ name: 'Whitney' }, { name: 'Sara' }])
// -> insert into "users" ("name") values (?), (?)
// !> ['Whitney', 'Sara']

db.insert('users').values({ name: 'Whitney' }).values({ name: 'Sara' })
// -> insert into "users" ("name") values (?), (?)
// !> ['Whitney', 'Sara']

db.insert('users', { name: 'Whitney' })
// -> insert into "users" ("name") values (?)
// !> ['Whitney']
```

Chainable methods include:

- `values` Add more sets of values to insert. See examples above.

### Update

Update queries can be executed via `db.update` or `db.query.update`.

```js
db.update('users').set({ name: 'Whitney' }).where({ id: 5 })
// -> update "users" set "name" = ? where "id" = ?
// !> ['Whitney', 5]

db.update('users')
  .set({ first: 'Whitney' })
  .set({ last: 'Young' })
// -> update "users" set "first" = ?, "last" = ?
// !> ['Whitney', 'Young']

db.update('users', { name: 'Whitney' })
// -> update "users" set "name" = ?
// !> ['Whitney']
```

Chainable methods include:

- `set` Add values to set. See examples above.
- `where` Will not convert property names or join relationships. See
[`#where`](#methods--where-).

### Delete

Delete queries can be executed via `db.delete` or `db.query.delete`.

```js
db.delete('users').where({ name: 'Whitney' })
// -> delete from "users" where "name" = ?
// !> ['Whitney']
```

Chainable methods include:

- `where` Will not convert property names or join relationships. See
[`#where`](#methods--where-).


### Raw

Update queries can be executed via `db.query.raw`.

```js
db.query.raw('select * from "users" where "id" = ?', [1])
// -> select * from "users" where "id" = ?
// !> [1]
```

Raw queries have no chainable methods. Be very cautious of
[SQL injection][sql-injection] when using raw queries.


[azul-managers]: /guides/managers/
[azul-models#objects]: /guides/models/#methods-properties--objects-
[azul-relations]: /guides/relations/
[azul-backends#sqlite-lookups]: /guides/backends/#sqlite3-lookups
[sql-injection]: http://en.wikipedia.org/wiki/SQL_injection
