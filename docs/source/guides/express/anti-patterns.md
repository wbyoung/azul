---
title: Express Addon Anti-Patterns
toc: true
template: guide-page.html
---

# Express Addon Anti-Patterns

## Anti-pattern: Naming Models

The idea of naming your model classes when you define them is appealing to
allow easy re-use. With this addon, though, it is considered an anti-pattern
because it leads to easily overlooked mistakes.

The code below illustrates this idea. The definition of `Article` and `Author`
in the first two lines, hides the following mistakes:

- `Author` is not provided as part in the second route's decorations
- `Article` is misspelled in the second route's decorations

This leads to the following bugs:

- Uses of `Author` in the second route will not be bound to the transaction
- Uses of `Article` in the second route will not be bound to the transaction

Essentially, even though it appears that the second route is executing all
queries in a transaction, none of them are.

```js
var Article = db.model('article', { title: db.attr(), author: db.belongsTo(), });
var Author = db.model('author', { name: db.attr(), articles: db.hasMany(), });

var transaction = azulExpress.transaction;
var route = azulExpress.route;

// no transaction
app.get('/articles', function(req, res) {
  return Article.objects.fetch().then(function(articles) {
    res.send({ articles: _.map(articles, 'json') });
  });
}));

// transaction enabled
app.post('/articles', transaction, route(function(req, res, Aritcle) {
  return Author.objects.findOrCreate({ name: req.body.author })
  .then(function(author) {
    return Article.create({ author: author title: req.body.title }).save();
  })
  .then(function(article) {
    res.send({ article: article.json });
  });
}));
```

The above code has one minor advantage: routes that do not use transactions do
not require the use of the addon's [`route`][azul-express#decorated-route]
wrapper for dependency injection since the models are accessible globally. This
saves a few keystrokes, but the disadvantages outlined above outweigh the few
keys saved.

### Solution: Dependency Injection

The corrected version does not name the model classes and instead uses
a [decorated route][azul-express#decorated-route] that provides dependency
injection. The two issues outlined above would have become very clear since
both would have produced runtime errors.

```js
db.model('article', { title: db.attr(), author: db.belongsTo(), });
db.model('author', { name: db.attr(), articles: db.hasMany(), });

var transaction = azulExpress.transaction;
var route = azulExpress.route;

// no transaction
app.get('/articles', route(function(req, res, Article) {
  return Article.objects.fetch().then(function(articles) {
    res.send({ articles: _.map(articles, 'json') });
  });
}));

// transaction enabled
app.post('/articles', transaction, route(function(req, res, Author, Article) {
  return Author.objects.findOrCreate({ name: req.body.author })
  .then(function(author) {
    return Article.create({ author: author title: req.body.title }).save();
  })
  .then(function(article) {
    res.send({ article: article.json });
  });
}));
```

You could also define your models in a separate module and not import them into
the module that defines your Express routes.

[azul-express#decorated-route]: /guides/express/#methods-properties-route
