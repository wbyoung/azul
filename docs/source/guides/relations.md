---
title: Relations
toc: true
active: guides
template: guide-page.html
---

# Relations

Relationships between different models in Azul.js are supported via
[`belongsTo`](#methods-belongsto) and [`hasMany`](#methods-hasmany)
attributes. These types of attributes build relationships between your models
that allow you to easily access and manipulate related data in you database.

## Types of Relationships

This section outlines how to set up the most common relationship types, the
methods that are added to your model as a result of defining a relationship,
and the associated migrations that should be created for each relationship
type.

### One-to-Many

In this example, we'll build a simple relationship between a _blog_ and its
_articles_.

```js
var Blog = db.model('blog', {
  title: db.attr(),
  articles: db.hasMany()
});

var Article = db.model('article', {
  title: db.attr(),
  body: db.attr(),
  blog: db.belongsTo()
});
```

Each instance of the `Blog` class will now be able to use the following
methods and properties:

- [`Blog#articles`](#methods-hasmany-associations)
- [`Blog#articleObjects`](#methods-hasmany-associationobjects)
- [`Blog#createArticle()`](#methods-hasmany-createassociation)
- [`Blog#addArticle()`](#methods-hasmany-addassociation)
- [`Blog#addArticles()`](#methods-hasmany-addassociations)
- [`Blog#removeArticle()`](#methods-hasmany-removeassociation)
- [`Blog#removeArticles()`](#methods-hasmany-removeassociations)
- [`Blog#clearArticles()`](#methods-hasmany-clearassociations)

And each instance of the `Article` class will now have:

- [`Article#blog`](#methods-belongsto-association)
- [`Article#blogId`](#methods-belongsto-associationid)
- [`Article#createBlog()`](#methods-belongsto-createassociation)
- [`Article#fetchBlog()`](#methods-belongsto-fetchassociation)

A migration for this would look involve creating the foreign key when creating
the `articles` table:

```js
exports.change = function(schema) {
  schema.createTable('blogs', function(table) {
    table.string('title');
  });

  schema.createTable('articles', function(table) {
    table.string('title');
    table.text('body');
    table.integer('blog_id').references('blogs.id');
  });
};
```

### Many-to-Many

Many to many relationships are supported via the use of a [_through_](#through)
option on a [`hasMany`](#methods-hasmany).


This example will build a relationship between _doctors_ and _patients_ through
_appointments_. In this case, the `Appointment` model is a _join model_ for our
relationship.

```js
var Doctor = db.model('doctor', {
  name: db.attr(),
  patients: db.hasMany({ through: 'appointments' })
});

var Patient = db.model('patient', {
  name: db.attr(),
  doctors: db.hasMany({ through: 'appointments' })
});

var Appointment = db.model('appointment', {
  occursAt: db.attr(),
  doctor: db.belongsTo(),
  patient: db.belongsTo(),
})
```

The following methods and properties will be added on the `Doctor` and
`Patient`:

- [`Doctor#patients`](#methods-hasmany-associations)
- [`Doctor#patientObjects`](#methods-hasmany-associationobjects)
- [`Doctor#createPatient()`](#methods-hasmany-createassociation)
- [`Doctor#addPatient()`](#methods-hasmany-addassociation)
- [`Doctor#addPatients()`](#methods-hasmany-addassociations)
- [`Doctor#removePatient()`](#methods-hasmany-removeassociation)
- [`Doctor#removePatients()`](#methods-hasmany-removeassociations)
- [`Doctor#clearPatients()`](#methods-hasmany-clearassociations)


- [`Patient#doctors`](#methods-hasmany-associations)
- [`Patient#doctorObjects`](#methods-hasmany-associationobjects)
- [`Patient#createDoctor()`](#methods-hasmany-createassociation)
- [`Patient#addDoctor()`](#methods-hasmany-addassociation)
- [`Patient#addDoctors()`](#methods-hasmany-addassociations)
- [`Patient#removeDoctor()`](#methods-hasmany-removeassociation)
- [`Patient#removeDoctors()`](#methods-hasmany-removeassociations)
- [`Patient#clearDoctors()`](#methods-hasmany-clearassociations)

When manipulating the many-to-many relationship through these methods, the join
model, `Appointment` will not be used, so the date of the appointment,
`occursAt`, will not be set. For instance:

```js
var Promise = require('bluebird');

Promise.all([
  Doctor.objects.find(4),
  Patient.objects.find(9),
])
.spread(doctor, patient) {
  return doctor.addPatient(patient);
});
// -> insert into appointments (doctor_id, course_id) values (?, ?)
// !> [4, 9]
```

If the date of the appointment needs to be set, you should use the
_join model_, `Appointment` directly instead (see the next code example).

The `Appointment` class will have the following methods added:

- [`Appointment#doctor`](#methods-belongsto-association)
- [`Appointment#doctorId`](#methods-belongsto-associationid)
- [`Appointment#createDoctor()`](#methods-belongsto-createassociation)
- [`Appointment#fetchDoctor()`](#methods-belongsto-fetchassociation)


- [`Appointment#patient`](#methods-belongsto-association)
- [`Appointment#patientId`](#methods-belongsto-associationid)
- [`Appointment#createPatient()`](#methods-belongsto-createassociation)
- [`Appointment#fetchPatient()`](#methods-belongsto-fetchassociation)

And the same association of doctor and patient from above can be achieved via:

```js
var Promise = require('bluebird');

Promise.all([
  Doctor.objects.find(4),
  Patient.objects.find(9),
])
.spread(doctor, patient) {
  var appointment = Appointment.create();
  appointment.occursAt = new Date(2015, 0, 12);
  appointment.doctor = doctor;
  appointment.patient = patient;
  return appointment.save();
});
// -> insert into appointments (occurs_at, doctor_id, course_id)
// -> values (?, ?, ?)
// !> [new Date(2015, 0, 12), 4, 9]
```


A migration for this would look involve creating the join table for the
relationship:

```js
exports.change = function(schema) {
  schema.createTable('doctors', function(table) {
    table.string('name');
  });

  schema.createTable('patients', function(table) {
    table.string('name');
  });

  schema.createTable('appointments', function(table) {
    table.dateTime('occursAt');
    table.integer('doctor_id').references('doctors.id');
    table.integer('patient_id').references('patients.id');
  });
};
```

In some cases, it may not be not necessary to define the model through which
the many-to-many relationship is built. In this case, you can use the `join`
option which will set up the required join model for you. For instance, if you
built a relationship between _assemblies_ and _parts_, you could just do:

```js
var Assembly = db.model('assembly', {
  name: db.attr(),
  assmeblies: db.hasMany({ join: 'assmeblies_parts' })
});

var Part = db.model('part', {
  partNumber: db.attr(),
  parts: db.hasMany({ join: 'assmeblies_parts' })
});
```

Note, though, that the `assmeblies_parts` join table must be created in a
migration. Also, Azul will actually create an `AssemblyPart` model for you and
add the necessary `belongsTo` attributes.

<div class="panel panel-info">
<div class="panel-heading">
  <span class="panel-title">Join Table Names</span>
</div>
<div class="panel-body">
Unlike some ORM tools, Azul.js does not automatically generate join table names
for you. You can follow the conventions of other ORM tools when the through
relation is overly abstract (as the above example does).
</div>
</div>


### One-to-One

<div class="panel panel-info">
<div class="panel-heading">
  <span class="panel-title">Coming Soon&hellip;</span>
</div>
<div class="panel-body">
We'll be adding one-to-one relationships via <code>belongsTo</code> and
<code>hasOne</code> shortly.
</div>
</div>

## Through

Through associations allow you to access and build more complex relationships
easily. One way that they can be used is to build
[many-to-many](#types-of-relationships-many-to-many) relationships.

Another way that they can be used is to build shortcut relationships. Take, for
example, a blog with articles and comments. You could build the following
relationships:

```js
var Blog = db.model('blog', {
  title: db.attr(),
  articles: db.hasMany(),
});

var Article = db.model('article', {
  title: db.attr(),
  blog: db.belongsTo(),
  comments: db.hasMany(),
});

var Comment = db.model('comment', {
  body: db.attr(),
  article: db.belongsTo(),
});
```

You may find yourself needing to access all of the comments for a blog. To do
so, you can add a through relationship shortcut:

```js
Blog.reopen({
  comments: hasMany({ through: 'articles' })
});
```

### Nesting

Through relationships can be nested to create deep shortcuts.

This example omits any attributes for brevity, but the `Site` object is able
to access `commenters` through `authors` then `posts` then `comments` until it
finally gets to the `commenters`:

```js
var Site = db.model('site', {
  authors: db.hasMany(),
  commenters: db.hasMany({ through: 'authors' }),
});
var Author = db.model('author', {
  site: db.belongsTo()
  posts: db.hasMany(),
  commenters: db.hasMany({ through: 'posts' }),
});
var Post = db.model('post', {
  author: db.belongsTo(),
  comments: db.hasMany(),
  commenters: db.hasMany({ through: 'comments' })
});
var Comment = db.model('comment', {
  post: db.belongsTo(),
  commenter: db.belongsTo()
});
var Commenter = db.model('commenter', {
  comments: db.hasMany()
});
```

The same basic configuration could also be achieved by putting most of the
through relations on the `Site`:

```js
var Site = db.model('site', {
  authors: db.hasMany(),
  posts: db.hasMany({ through: 'authors' }),
  comments: db.hasMany({ through: 'posts' }),
  commenters: db.hasMany({ through: 'comments' }),
});
var Author = db.model('author', {
  site: db.belongsTo()
  posts: db.hasMany(),
});
var Post = db.model('post', {
  author: db.belongsTo(),
  comments: db.hasMany(),
});
var Comment = db.model('comment', {
  post: db.belongsTo(),
  commenter: db.belongsTo(),
});
var Commenter = db.model('commenter', {
  comments: db.hasMany()
});
```


### Limitations

Through relationships only support create, add, remove, and clear methods when
they are used for [many-to-many](#types-of-relationships-many-to-many)
relationships. For shortcuts like the example shown above, those methods will
not be available.


## Methods

### `#belongsTo([options])`

A belongs-to relationship adds the following properties and methods:

`association` is a placeholder for the name of the belongs-to relation being
defined. If the name of the relation was `author`, i.e.
`Model.reopen({ author: db.belongsTo() })`, then `fetchAuthor` would be one of
the methods added to `Model`.

- [`association`](#methods-belongsto-association)
- [`associationId`](#methods-belongsto-associationid)
- [`createAssociation()`](#methods-belongsto-createassociation)
- [`fetchAssociation()`](#methods-belongsto-fetchassociation)

#### Options

If the property name does not match the name of the related model, pass the
model name as the first argument. For instance to associate `Article` and
`User` through the relation name `author`:

```js
Article.reopen({
  author: db.belongsTo('user')
})
```

`belongsTo` accepts the following options:

- `inverse` The name of the inverse relationship. The default is to determine
  the inverse from the model name and values defined on the related model. The
  above example would search for either a [`hasMany`](#methods-hasmany) named
  `articles` or a [`hasOne`](#methods-hasone) named `article`.
- `primaryKey` The name of the primary key in the relationship. This defaults
  to the primary key defined on the inverse relationship or `pk` if no inverse
  is defined.
- `foreignKey` The name of the foreign key in the relationship. This defaults
  to `<relationName>Id`. The above example would have a default of
  `authorId`.

#### `#association=`

Access the relation. This will throw an error if the relation has not yet been
loaded. Load the association before accessing it using
[`with`][azul-queries#with] or via
[`fetchAssociation`](#methods-belongsto-fetchassociation).

```js
Article.objects.with('blog').find(1).then(function(article) {
  console.log(article.blog);
});

// this will throw an exception because the blog is not loaded with the query
Article.objects.find(1).then(function(article) {
  article.blog; // throws!
});
```

This property is also a setter used to alter the relationship. The changes will
remain in memory until [saved][azul-models#save]:

```js
Promise.all([ Article.objects.find(1), Blog.objects.find(4) ])
.spread(article, blog) {
  article.blog = blog;
  return article.save();
});
```

#### `#associationId`

Access the foreign key value for this relationship.

```js
Article.objects.with('author').find(1).then(function(article) {
  article.authorId; // => 7
});
// assuming article 1 is written by person 7
```


This will actually be generated from the `foreignKey` option given to the
`belongsTo`. For instance:

```js
Article.reopen({
  author: db.belongsTo({ foreignKey: 'writerId' })
});

Article.objects.with('author').find(1).then(function(article) {
  article.author; // => [Author { id: 7 }]
  article.writerId; // => 7
});
// assuming article 1 is written by person 7
```

To change the name of the foreign key field that's used in the database, simply
specify this attribute yourself when you setup the relationship:

```js
var Article = db.model('article', {
  author: db.belongsTo(),
  authorId: db.attr('author_dbid'),
});
```

#### `#createAssociation([attrs])`

Create a new object of the relationship type and sets it as the related value.

```js
var blog = article.createBlog({ title: 'Blog' });
article.blog === blog; // => true
```

#### `#fetchAssociation()`

Fetch the associated object.

```js
Article.objects.find(1).then(function(article) {
  return article.fetchBlog();
})
.then(function(blog) {
  console.log(blog);
});
```

Once fetched, the value will also be accessible via the
[`association`](#methods-belongsto-association) property.

```js
Article.objects.find(1).tap(function(article) {
  return article.fetchBlog();
})
.then(function() {
  console.log(article.blog);
});
// see bluebird.js for details on tap
```

### `#hasMany([options])`

A has-many relationship adds the following properties and methods:

`association` is a placeholder for the name of the has-many relation being
defined. If the name of the relation was `articles`, i.e.
`Model.reopen({ articles: db.hasMany() })`, then `clearArticles` would be one
of the methods added to `Model`.

- [`associations`](#methods-hasmany-associations)
- [`associationObjects`](#methods-hasmany-associationobjects)
- [`createAssociation()`](#methods-hasmany-createassociation)
- [`addAssociation()`](#methods-hasmany-addassociation)
- [`addAssociations()`](#methods-hasmany-addassociations)
- [`removeAssociation()`](#methods-hasmany-removeassociation)
- [`removeAssociations()`](#methods-hasmany-removeassociations)
- [`clearAssociations()`](#methods-hasmany-clearassociations)

#### Options

If the property name does not match the name of the related model, pass the
pluralized model name as the first argument. For instance to associate `Author`
and `Article` through the relation name `posts`:

```js
Author.reopen({
  posts: db.hasMany('articles')
})
```

`hasMany` accepts the following options:

- `inverse` The name of the inverse relationship. The default is to determine
  the inverse from the model name. The above example would have an inverse of
  `author`.
- `primaryKey` The name of the primary key in the relationship. This defaults
  to `pk`.
- `foreignKey` The name of the foreign key in the relationship. This defaults
  to the foreign key defined on the inverse relationship or `<inverse>Id` if no
  inverse is defined. The above example would have a default of `authorId`.
- `through` Specify the name of a relationship through which this collection is
accessed.
- `source` When using `through` this is the name of the relationship on the
destination model. The default value is the name of the attribute for the
relationship.

#### `#associations`

Access the related items. This will throw an error if the relation has not yet
been loaded. Load the association before accessing it using
[`with`][azul-queries#with] or via
[`associationObjects.fetch`](#methods-hasmany-associationobjects).

```js
Blog.objects.with('articles').find(1).then(function(blog) {
  console.log(blog.articles);
});
```

#### `#associationObjects`

Access a query object that can be used to fetch the objects or a subset of the
related objects.

```js
Blog.objects.find(1).then(function(blog) {
  return blog.articleObjects.fetch();
})
.then(function(articles) {
  console.log(articles);
});
```

Once fetched, the related objects will also be accessible via the
[`associations`](#methods-hasmany-associations) property.

```js
Blog.objects.find(1).tap(function(blog) {
  return blog.articleObjects.fetch();
})
.then(function() {
  console.log(blog.articles);
});
// see bluebird.js for details on tap
```

You can also use this [query][azul-queries] to find a subset of the related
objects. Note, though, that since a subset is being fetched, that this will not
make the related objects available through the
[`associations`](#methods-hasmany-associations) property.

```js
Blog.objects.find(1).then(function(blog) {
  return blog.articleObjects.where({ title$contains: 'Azul' });
})
.then(function(articles) {
  console.log(articles);
});
```

#### `#createAssociation([attrs])`

Create a new object of the relationship type. This will also set the foreign
key on the created object and add it to the related items if they have been
loaded.

```js
var article = blog.createArticle({ title: 'Azul' });
blog.id; // => 7
article.blogId; // => 7
```

#### `#addAssociation(model)`

This method is used to add objects to the relationship. The changes will remain
in memory until [saved][azul-models#save]:

```js
Promise.all([ Article.objects.find(1), Blog.objects.find(4) ])
.spread(article, blog) {
  blog.addArticle(article);
  return blog.save();
});
```

This method returns a _thenable_ object that simply saves the object. The above
code could be simplified like so:

```js
Promise.all([ Article.objects.find(1), Blog.objects.find(4) ])
.spread(article, blog) {
  return blog.addArticle(article);
});
```

#### `#addAssociations(models)`

Allows [adding](#methods-hasmany-addassociations) of multiple associations.
Pass an array or multiple arguments.

```js
blog.addArticles([article1, article2]);
blog.addArticles(article1, article2);
```

#### `#removeAssociation(model)`

This method is used to remove objects to the relationship. The changes will
remain in memory until [saved][azul-models#save]:

```js
Promise.all([ Article.objects.find(1), Blog.objects.find(4) ])
.spread(article, blog) {
  blog.removeArticle(article);
  return blog.save();
});
```

Like [`addAssociation()`](#methods-hasmany-addassociation), this method
returns a _thenable_ object that simply saves the object.

#### `#removeAssociations(models)`

Allows [removing](#methods-hasmany-removeassociation) of multiple
associations. Pass an array or multiple arguments.

```js
blog.removeArticles([article1, article2]);
blog.removeArticles(article1, article2);
```

#### `#clearAssociations()`

Clear all related objects.

```js
blog.clearArticles();
```

[azul-models#save]: /guides/models/#methods-properties-save
[azul-queries]: /guides/queries/
[azul-queries#with]: /guides/queries/#relationships-with
