---
title: Transactions
toc: true
template: guide-page.html
---

# Transactions

## Basics

Transactions are straightforward to use in Azul.js. You simply create a new
transaction object via [`db.transaction()`][azul-queries#transactions]. That
object can then be used to create [`begin`](#methods--begin-),
[`commit`](#methods--commit-), and [`rollback`](#methods--rollback-) queries.
Here's a quick example:

```js
var transaction = db.transaction();

transaction.begin().execute()
.then(function() {
  return User.objects
    .transaction(transaction) // associate with transaction
    .update({ username: 'azul' }).where({ pk: 25 });
})
.then(function() {
  return profile.save({ transaction: transaction });
})
.then(function() { return transaction.commit(); })
.catch(function() { return transaction.rollback(); });
```

Read on to see how to associate transactions with [queries](#with-queries) and
[models](#with-models)

## Methods

### `begin`

Create a new begin query. Make sure you execute this query before any queries
within the transaction.

### `commit`

Create a new commit query.

### `rollback`

Create a new rollback query.

## With Queries

As shown in the initial example, you can call
[`transaction`][azul-queries#transaction-method] on any query to generate a
query that will run in that transaction. When you plan to execute many queries
in a transaction, it may be useful to reuse that query.

```js
var transaction = db.transaction();
var articles = Article.objects.transaction(transaction);

transaction.begin().execute()
.then(function() {
  return articles.update({ title: 'Azul.js' }).where({ title: 'Azul' });
})
.then(function() {
  return articles.insert({ title: 'Azul.js Launch' });
})
.then(function() { return transaction.commit(); })
.catch(function() { return transaction.rollback(); });
```

## With Models

As shown in the initial example, you can pass `transaction` as an option when
you [`save`][azul-model#save] a model.

## Nested Transactions

Azul.js supports nested transactions as well. Simply execute additional begins:

```js
var transaction = db.transaction();

transaction.begin().execute()
.then(function() { /* something else */ })
.then(function() { return transaction.begin(); })
.then(function() { /* something else */ })
.then(function() { /* something else */ })
.then(function() { return transaction.commit(); })
.then(function() { return transaction.commit(); })
.catch(function() { return transaction.rollback(); });
```

[azul-model#save]: /guides/models/#methods-properties--save-
[azul-queries#transactions]: /guides/queries/#transactions
[azul-queries#transaction-method]: /guides/queries/#transactions--transaction-