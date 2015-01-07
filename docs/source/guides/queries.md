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
above, `Article.objects` is a query object. Calling [`where`](#-where-) returns
a query object as well, allowing you to then call [`order`](#-order-). Each
subsequent call builds on the previous query.

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

Each [`where`](#-where-) builds off of the original query object. The first call
only specifies to fetch articles where the `id` is `5`. The second only
specifies to fetch where the `title` is `Azul`. Neither call mutated the
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
must call [`execute`](#-execute-), [`fetch`](#-fetch-), [`find`](#-find-), or
[`then`](#-then-) on the object.

Lazy evaluation allows queries to be passed around to different parts of your
application without actually being executed until some condition is met.
Queries can be built and discarded with very little performance overhead.

### Caching

When a query is executed, the result will be cached so it can be re-used if
execution is requested again. This usually results in a desired performance
gain as your application will not need to re-request data from the database
when the result is already known. In some cases, however, you may need to force
a query to be re-executed. In that case, you can simply [clone the
query](#-clone-).

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

- [Automatically joins](#automatic-joining) relationships

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
- [Automatically joins](#automatic-joining) relationships

### `#clone`

Create a new query that has the exact same conditions as this query. This
method can be used to ensure that executing a query will not use a
[cached result](#caching).

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

The following lookups are supported:

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
Article.objects.where({ 'title[iExact]': 'azul.js' });
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

### `iRegex`

A case-insensitive regular expression test.

### `between`

A test for a value being between two values.

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

Content coming soon&hellip;

### `gte`

Content coming soon&hellip;

### `lt`

Content coming soon&hellip;

### `lte`

Content coming soon&hellip;

### `isNull`

Content coming soon&hellip;

### `year`

Content coming soon&hellip;

### `month`

Content coming soon&hellip;

### `day`

Content coming soon&hellip;

### `hour`

Content coming soon&hellip;

### `minute`

Content coming soon&hellip;

### `second`

Content coming soon&hellip;

## Executing

### `#execute`

Executes a query. Once executed, subsequent calls will use the result from the
first execution. [Read the details in caching](#caching).

```js
query.execute(function(results) {
  // execution complete
});
```

### `#fetch`

Essentially an alias for [`execute`](#-execute-), this method is preferred in
most cases for readability when reading data from the database.

```js
Article.objects.fetch().then(function() { /* ... */ }); // reads better
Article.objects.execute().then(function() { /* ... */ });
```

**Advanced:** For [non-model queries & results](#non-model-queries-results), this method
actually ensures that the resolved object is transformed to an array rather
than a standard result object.

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
[`fetch`](#-fetch-) or [`execute`](#-execute-) in non-promise handlers. For
readability, this is strongly discouraged. And returning explicitly executed
queries inside of promise handlers is considered acceptable:

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
a query. This will usually be handled for you via [automatic
joining](#automatic-joining), but you can also explicitly join a relationship
into a query.

For instance, finding all articles that have a comment marked as spam:

```js
Article.objects.join('comments').where({ spam: true });
```

Azul.js will resolve names to the appropriate model when possible. In this
case, it is able to determine that `spam` is an attribute that's defined on the
`Comment` model and executes the appropriate database query. The properties
`id` and `body` are ambiguous, though, and must be qualified as `comments.id`
and `commens.body` if they refer to the joined association.

In the above example, the `where` call could have automatically joined the
`comments` relation by specifying `comments.spam` rather than just `spam` in
the where condition, and the explicit join would not have been required.


### Automatic Joining

Most situations that require a [`join`](#-join-) to occur between relationships
will be handled automatically.

Methods that support automatic joining will use the attribute string to
determine if a relationship exists that can be joined.

The following queries would automatically add a join:

```js
Article.objects.where({ 'comments.spam': true });
Comment.objects.order('article.title');
```

The following methods support automatic joining:

- [`where`](#-where-)
- [`order`](#-order-)

## Raw queries

Sometimes you may need to execute raw SQL queries. While this is discouraged,
it can still be done. Raw queries on models are expected to be `SELECT`
queries. For other types of SQL queries, see [non-model queries &
results](#non-model-queries-results).

```js
var query = Article.objects
  .raw('SELECT * FROM "articles" WHERE "id" = ?', [1]);

query.fetch().then(function(articles) {
  // articles is still an array of article objects
});
```

Be very cautious of [SQL injection][sql-injection] when using raw queries.

## Non-Model Queries & Results

Content coming soon&hellip;

[azul-managers]: /guides/managers.html
[azul-models#objects]: /guides/models.html#-objects-
[azul-relations]: /guides/relations.html
[sql-injection]: http://en.wikipedia.org/wiki/SQL_injection
