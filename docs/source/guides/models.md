---
title: Models
toc: true
active: guides
template: guide-page.html
---

# Models

Models are the basic unit of data within Azul.js. They allow you to manipulate
data in the database while thinking in terms of objects rather than raw SQL
queries.

## Defining Models

The following examples assume that you have completed the [steps for getting
started][azul-getting-started] and have access to an Azul.js database instance,
`db`. If you have not completed those steps, you should return and complete
them before attempting to use models.

### Quick Example

Models are easy to define with Azul.js. This example defines an _Article_ that
has a `title` and `body`:

```js
var Article = db.model('article', {
  title: db.attr(),
  body: db.attr()
});
```

### Conventions

The above model would be associated with a database table `articles` having
three columns, `id`, `title`, and `body`.

Azul.js will default to a table name that is simply the pluralized version of
the model name.

All models will have a primary key column. The default name for this column is
_id_. Usually you will want this to be a _serial_ or _auto incrementing_ column
in your database.

By default, Azul.js will determine database column names from attribute names.
It assumes that database columns follow the standard convention of using
underscore casing and will convert to underscore case. For instance, a
`firstName` attribute would be mapped to a column name of `first_name`.

### Attributes

Attributes defined on a model are readable and writable properties that you can
use to update and save your model.

To specify a column name for an attribute, simply pass it as an argument to
`db.attr`:

```js
var Article = db.model('article', {
  title: db.attr('headline'),
  body: db.attr('content')
});
```

Azul.js does not distinguish between different attribute types when defining
models. The types will be cast when reading and writing from the database.
See the [migrations guide][azul-migrations] for more details.

The `attr` function is also available via the main `azul` export for
convenience.

<div class="panel panel-info">
<div class="panel-heading">
  <span class="panel-title">Coming Soon&hellip;</span>
</div>
<div class="panel-body">
Defining your attributes both in the migration and the model is currently
required. We'll be addressing this shortly so it's a bit less tedious to create
new models.
</div>
</div>

### Primary Key

Each model in Azul.js requires a primary key. By default it will be _id_, but
it can be overridden by defining the `pk` attribute:

```js
var Article = db.model('article', {{
  pk: attr('custom_identifier')
});
```

We recommend using a _serial_ or _auto incrementing_ column in your database
for the primary key column. See the [migrations guide][azul-migrations] for
more details.

The primary is also accessible via the attribute alias `id` (even when `pk` is
overridden).

### Table Name

The table name can be customized by defining the class property, `tableName`:

```js
var Article = db.model('article');

Article.reopenClass({
  tableName: 'publications',
});
```

## Manipulating Data

Manipulating data in the database is the most fundamental task for Azul.js. As
with all data based systems, you'll have to create, read, update, and delete
the data that's stored in your database.

All database operations are asynchronous. Azul.js uses promises for
asynchronous control flow. All uses of `then` in the methods below indicate
that the method returns a promise.

The following examples will assume the `Article` model from above has been
defined.

### Create

When you create instances of a model, it will be stored in memory until `save`
has been called:

```js
var article = Article.create({
  title: 'Azul.js',
  body: 'Azul.js has been launched!'
});

article.save().then(function() {
  // the article has now been saved
});
```

Because the act of creating the object in the database is an asynchronous
operation, the `save` method returns a promise that will resolve when the
save has completed successfully.

As you can see above, you can pass attributes to the `create` method that will
be set on your model. Be sure that you trust your source of data when doing so
as this can lead to a [mass assignment vulnerability][mass-assignment].

### Read

Objects can easily be read from the database through
[query objects][azul-queries].

```js
Article.objects.fetch().then(function(articles) {
  // all articles have been fetched &
  // articles contains an array of Article objects
});
```

If you're searching for just one object, you can also use the `find` method to
search by primary key:

```js
Article.objects.find(1).then(function(article) {
  // the article with primary key 1 has been found
});
```

Reading from the database is asynchronous, so [`fetch`][azul-queries#fetch] and
[`find`][azul-queries#find] return promises that resolve with the results from
the database.

For more information on fetching objects from the database, see the [full
query guide][azul-queries].


### Update

Updating objects is quite simple. Assuming you have an article that is already
persisted to the database, you can simply update the properties of your object
and save it:

```js
article.title = 'Azul.js 1.0 Release';
article.save().then(function() {
  // the article has been updated in the database
});
```

As seen before when [creating and saving](#manipulating-data-create) an object,
`save` returns a promise.

### Delete

Deleting an object can be accomplished by calling `delete`. Like the creation
of an object, changes will not be persisted in the database until `save` has
been called:

```js
article.delete(); // marked for deletion
article.save().then(function() {
  // the article has now been deleted
});
```

Again note that `save` returns a promise.


### Create, Update, or Delete?

The `save` method is used for creating, updating, and deleting objects. Azul.js
determines which action to take based on the following rules:

- Objects without a _primary key_ set will be created (`INSERT`)
- Objects that have changes will be updated (`UPDATE`)
- Objects that are marked for deletion will be deleted (`DELETE`)

There are situations where you may want to force an insert to occur with a
specific primary key. To do so, pass the `method` option to `save`:

```js
var article = Article.create({ id: 5, title: 'Title', body: 'Body...' });

article.save({ method: 'insert' }).then(function() {
  // article inserted with specific primary key
});
```

You can also use the `method` option to force the update of an object that does
not have any changes. Another way to accomplish the same thing would be to
simply re-assign a property.

```js
article.save({ method: 'update' }).then(function() {
  // update query executed even if the article was not changed
});

// alternative forced update:
article.id = article.id;
article.save().then(function() {
  // update query executed
});
```

## Methods & Properties

### `#save([options])`

Saves the model if it hasn't already been saved. This method is used to persist
in memory changes and must be called after creating, altering, or deleting a
model in order for the changes to be saved to the database.

The returned promise will resolve with the model instance when the save
succeeds.

``` js
model.save().then(function(model) { /* ... */ });
```

### `#delete()`

Marks the model for deletion.

When a model has been marked for deletion & saved, it will still exist in
memory. Re-saving an object in this state will have no effect.

See examples in the [deleting section](#manipulating-data-delete).

### `#json`

The attributes of a model object. For instance, a `Person` defined like so:

```js
var Person = db.model('person', {
  firstName: db.attr(),
  lastName: db.attr()
});

var person = Person.create({ firstName: 'Whitney', lastName: 'Young' });
```

Would have `json` of:

```js
person.json; // => { id: undefined, firstName: 'Whitney', lastName: 'Young' }
```

- readonly

### `#attrs`

The attributes, keyed by database field name, currently set on this object.
That is, a `Person` defined [as shown in the above
example](#methods-properties-json) would have `attrs` of:

```js
person.attrs; // => { id: undefined, first_name: 'Whitney', last_name: 'Young' }
```

- readonly

### `#newRecord`

Determine if this is a new record. Model that do not have a _primary key_ are
considered new. New records will be inserted when a model is saved. To better
understand this behavior, read about [how the save method is
determined](#manipulating-data-create-update-or-delete-).

- readonly

### `#persisted`

Determine if this model is persisted, that is, it is not deleted nor new.

- readonly

### `#deleted`

Determine if this model is deleted or has been marked for deletion.

- readonly

### `#dirty`

Determine if this model has changes that have not yet been persisted to the
database.

- readonly

### `.objects`

Access a [query object][azul-queries] that will allow you to fetch models of
this type from the database. Note that this can be customized by creating your
own [custom manager][azul-managers#overriding-the-default-manager].

- readonly

### `.tableName`

The name of the table in the database which contains the data.

You can override this property like so:

```js
var Article = db.model('article');

Article.reopenClass({
  tableName: 'publications',
});
```

- readonly

[azul-getting-started]: /getting-started/
[azul-migrations]: /guides/migrations/
[azul-queries]: /guides/queries/
[azul-queries#fetch]: /guides/queries/#executing-fetch
[azul-queries#find]: /guides/queries/#executing-find
[azul-managers#overriding-the-default-manager]: /guides/managers/#overriding-the-default-manager
[mass-assignment]: http://en.wikipedia.org/wiki/Mass_assignment_vulnerability
