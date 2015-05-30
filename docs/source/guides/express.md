---
title: Express Addon
toc: true
template: guide-page.html
---

# Express Addon

## Overview

The [Express addon][azul-express] is designed to make working with Azul.js and
[Express][express] as convenient as possible. It currently serves two main
functions:

1. Dependency injection of models & queries
1. Transaction management

This quick example shows how to use transactions for all requests with Express.
See the [full example](#full-example) for details.

```js
var azulExpress = require('azul-express')(db);
var route = azulExpress.route;
var transaction = azulExpress.transaction;

app.use(transaction);
app.post('/articles', route(function(req, res, Article, Author) {
  return Author.objects.findOrCreate({ name: req.body.author })
  .then(function(author) {
    return author.createArticle({ title: req.body.title }).save();
  })
  .then(function(article) {
    res.send({ article: article.json });
  });
}));
```

## Methods & Properties

The methods & properties below assume that you have provided a database to the
addon. To do so, require and call the module's exported function. In one line,
that is:

```js
var azulExpress = require('azul-express')(db);
```

### `#route(decoratedRoute, [options])`

Create an [Express route][express-route] by wrapping a _decorated_ route. The
wrapper respects any [middleware](#methods-properties-transaction) that is
active via [dependency
injection](#methods-properties-route-dependency-injection) on the decorated
route.

A decorated route looks like an Express route, but has additional parameters.
Decorations may be:

- A parameter named `query`
- A capitalized model class name, i.e. `Model`

Decorated routes have the following signature:

`[err], req, res, [next], [query], [...Model]`

When using Azul.js with Express, we recommend wrapping all routes that use
Azul.js models or queries and
[leaving your models unnamed][azul-express-anti-patterns#naming-models] to
ensure that all routes properly define the models on which they depend:

```js
var route = azulExpress.route;

db.model('article', { // intentionally unnamed
  title: db.attr()
});

app.get('/articles', route(function(req, res, Article) {
  return Article.objects.fetch().then(function(articles) {
    res.send({ articles: _.map(articles, 'json') });
  });
}));
```

Decorated routes can also return promises (as shown above). Rejected promises
will be passed on to Express error middleware.

You can also use `azulExpress()` as a shortcut for `azulExpress.route()`.

#### `options.transaction`

Whether to enable a transaction for this route. This is redundant if
[transaction middleware](#methods-properties-transaction) is active.

#### `options.wrap`

You must provide your decorated function directly to
[`route`](#methods-properties-route). This option is provided in case you need
to pre-wrap the route.

For instance, to support [`co`][co] for generator based control flow:

```js
var co = require('co');
var azco = _.partial(azulExpress.route, _, { wrap: co.wrap });

app.post('/articles', azco(function*(req, res, Article, Author) {
  var author = yield Author.objects.findOrCreate({ name: req.body.author });
  var article = yield author.createArticle({ title: req.body.title }).save();
  res.send({ article: article.json });
}));

// this will not work:
route(co(function*(req, res, Article, Author) { /* ... */ }));
```

#### Dependency Injection

The [`route`](#methods-properties-route) function
provides dependency injection by creating a wrapper route that is compatible
with Express and injecting Azul.js dependencies based on named parameters.

When transactions are _not enabled_, injected dependencies will be:

- The `query` parameter will be a [basic query][azul-queries#data-queries],
  `db.query`.
- Any capitalized `Model` parameter will be the model class as defined on the
  database.

When a transaction is _enabled_ (either by the
[transaction middleware](#methods-properties-transaction) or the
[transaction option](methods-properties-route-options-transaction)), injected dependencies will be bound to the transaction:

- The `query` parameter will be a [basic query][azul-queries#data-queries],
  bound to the transaction.
- Any capitalized `Model` parameter will be a proxy class that works the same
  as the model class defined on the database. See
  [the advanced section](#methods-properties-route-advanced) for more details.


#### Advanced

**Always using wrapped routes & dependency injection**

You may have noted that
[dependency injection](#methods-properties-route-dependency-injection) serves
little purpose when transactions are not enabled. We do still suggest wrapping
your routes and using dependency injection for a few reasons:

1. Consistency
2. Ease of enabling transactions
3. Ensuring all routes use dependency injection rather than some relying on
   globals leading to the possibility of shadowing and/or misnamed
   dependencies. [See an example of why this is considered an
   anti-pattern][azul-express-anti-patterns#naming-models].

**Transaction bound, dependency injected model classes**

When transactions are enabled, the dependency injection provided by
[`route`](#methods-properties-route) will provide proxy classes. The classes
themselves and the instances of those classes (including relations) should not
live past the end of the current request. The transaction will have been
committed and using them will result in undefined behavior.

### `#transaction`

Transaction middleware for express. A transaction is begun at the start of the
request and is
[automatically commit](#methods-properties-transaction-explicit-commit) when
a response is sent.

```js
app.use(azulExpress.transaction);
```

This adds the following to the request and response objects:

- `req.azul.transaction` A [transaction][azul-transaction] object.
- `req.azul.query` A [basic query][azul-queries#data-queries] bound to the
  transaction.
- `res.azul.commit` A function to
  [explicitly commit](#methods-properties-transaction-explicit-commit) the
  transaction.
- `res.azul.rollback` A function to
  [explicitly rollback](#methods-properties-transaction-explicit-rollback) the
  transaction.

#### Implicit Commit

All transactions will implicitly be committed when a response is sent. Various
methods called on the response object, `res`, cause a response to begin being
sent. View the [Express][express-response] and [Node.js][node-response]
documentation for details.

Because methods to write a response are synchronous with regards to control
flow, writes will be queued until after the transaction has been committed.
That means that a call to `res.send()` (or any other method that writes) will
not occur immediately. It will be queued and re-run after the transaction is
committed.

For most uses, this will not cause problems. If for some reason, you need to
ensure that a write has been completed, [explicitly commit the
transaction](#methods-properties-transaction-explicit-commit) prior to sending
a response.

#### Explicit Commit

If you need to ensure that the commit has occurred before continuing, you can
explicitly commit the transaction via `res.azul.commit()` and wait for the
promise to resolve. You can do this before or after an implicit commit.

```js
app.get('/endpoint', function(req, res) {
  asyncOperation().then(function() {
    res.send({ status: 'complete' }); // automatic commit triggered
    return res.azul.commit(); // explicitly wait for commit
  });
});
```

#### Explicit Rollback

You can explicitly issue a rollback for a transaction via
`res.azul.rollback()`.

#### Parameterized Binding

When you use [`route`](#methods-properties-route), all decorated parameters
will be automatically bound to the transaction. See
[dependency injection](#methods-properties-route-dependency-injection) for
details.


### `#rollback`

Enable rollback support for routes that fail. This will only be used in very
specific scenarios:

- The [`transaction`](#transaction) middleware is active
- The route is not wrapped by [`route`](#methods-properties-route)
- The route calls `next` with an error argument

For instance, because the below route meets all of the above criteria, it
benefits from this middleware being used.

```js
app.use(azulExpress.transaction);

app.post('/endpoint', function(req, res, next) {
  insertData(db, req.transaction) // assume this inserts & uses the transaction
  .then(function() {
    throw new Error('Something terrible happened!');
  })
  .then(function() {
    res.send({ status: 'complete' });
  })
  .catch(next);
});

app.use(azulExpress.rollback);
```

Note that an error is thrown explicitly within the promise chain and occurs in
the application, not in the database. It will cause the `next` function to be
called with an error, indicating that the route failed.

With the rollback middleware active, this error will be seen and a `ROLLBACK`
will be issued in the database.

Without the middlware, a `COMMIT` would be issued when the error response is
written and the inserted data will exist in the database even though an error
occurred for the route.

This is also aliased as `catch` and `error`.

## Full Example

This example shows how to set up an app that uses the
[transaction middleware](#methods-properties-transaction) and
[decorated routes](#methods-properties-route). All operations within the route
for `POST /articles` will be performed in the same transaction.

```js
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var azul = require('azul');
var env = process.env.NODE_ENV || 'development';
var config = require('./azulfile')[env];
var db = azul(config);
var azulExpress = require('azul-express')(db);
var azulLogger = require('azul-logger');

azulLogger(db.query);

db.model('article', {
  title: db.attr(),
  author: db.belongsTo(),
});

db.model('author', {
  name: db.attr(),
  articles: db.hasMany(),
});

app.use(bodyParser.urlencoded());
app.use(azulExpress.transaction);

app.post('/articles', azulExpress.route(function(req, res, Article, Author) {
  return Author.objects.findOrCreate({ name: req.body.author })
  .then(function(author) {
    return author.createArticle({ title: req.body.title }).save();
  })
  .then(function(article) {
    res.send({ article: article.json });
  });
}));

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
```

Note that the models `Aritcle` and `Author` are intentionally [not assigned to
variables][azul-express-anti-patterns#naming-models].

[azul-transaction]: /guides/transaction/
[azul-express-anti-patterns#naming-models]: /guides/express/anti-patterns/#anti-pattern-naming-models
[azul-queries#data-queries]: /guides/queries/#data-queries
[azul-express]: https://github.com/wbyoung/azul-express
[azul-logger]: https://github.com/wbyoung/azul-logger
[express]: http://expressjs.com/
[express-route]: http://expressjs.com/4x/api.html#app.METHOD
[express-response]: http://expressjs.com/4x/api.html#res
[node-response]: https://nodejs.org/api/http.html#http_class_http_serverresponse
[co]: https://github.com/tj/co
