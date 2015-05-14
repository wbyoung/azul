---
title: Transactions
toc: true
template: guide-page.html
---

# Transactions

## Basics

Transactions are straightforward to use in Azul.js. You simply create a new
transaction query with [`begin`](#methods--begin-), and execute that. Any
additional queries you want to be run in the same transaction simply require
a call to [`transaction`](#methods--transaction-). When you are finished with
the transaction, you must either [`commit`](#methods--commit-) or
[`rollback`](#methods--rollback-). Here's a quick example:


```js
var begin = db.query.begin();
var transaction = begin;

begin.execute()
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

## Methods

### `begin`

Create a new transaction object & begin query. Make sure you execute this query
before any queries within the transaction.

### `commit`

Create a new commit query. This must be done on a query associated with a
transaction.

### `rollback`

Create a new rollback query. This must be done on a query associated with a
transaction.

### `transaction`

When called with no arguments, this gets the transaction associated with the
current query.

When called with an argument, it creates a new query that uses the given
transaction (or that query's transaction).

## With Models

As shown in the initial example, you can pass `transaction` as an option when
you [`save`][azul-model#save] a model.

## Nested Transactions

Azul.js supports nested transactions as well. Simply execute additional begins:

```js
var begin = db.query.begin();
var transaction = begin.transaction();

var begin = db.query.begin();
var transaction = begin;

begin.execute()
.then(function() { /* something else */ })
.then(function() { return transaction.begin(); })
.then(function() { /* something else */ })
.then(function() { /* something else */ })
.then(function() { return transaction.commit(); })
.then(function() { return transaction.commit(); })
.catch(function() { return transaction.rollback(); });
```

[azul-model#save]: /guides/models/#methods-properties--save-
