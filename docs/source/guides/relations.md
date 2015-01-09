---
title: Relations
toc: true
active: guides
template: guide-page.html
---

# Relations

Relationships between different models in Azul.js are supported via
[`belongsTo`](#-belongsto-) and [`hasMany`](#-hasmany-) attributes. These types
of attributes build relationships between your models that allow you to easily
access and manipulate related data in you database.

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

- [`Blog#articles`](#-associations-)
- [`Blog#articleObjects`](#-associationobjects-)
- [`Blog#createArticle()`](#-createassociation-)
- [`Blog#addArticle()`](#-addassociation-)
- [`Blog#addArticles()`](#-addassociations-)
- [`Blog#removeArticle()`](#-removeassociation-)
- [`Blog#removeArticles()`](#-removeassociations-)
- [`Blog#clearArticles()`](#-clearassociations-)

And each instance of the `Article` class will now have:

- [`Article#blog`](#-association-)
- [`Article#blogId`](#-associationid-)
- [`Article#createBlog()`](#-createassociation-)
- [`Article#fetchBlog()`](#-fetchassociation-)

A migration for this would look involve creating the foreign key when creating
the `articles` table:

```js
exports.up = function(schema) {
  var createBlogs = function() {
    return schema.createTable('blogs', function(table) {
      table.serial('id').primaryKey();
      table.string('title');
    });
  };

  var createArticles = function() {
    return schema.createTable('articles', function(table) {
      table.serial('id').primaryKey();
      table.string('title');
      table.text('body');
      table.integer('blog_id').references('blogs.id');
    });
  };

  return createBlogs().then(createArticles);
};

exports.down = function(schema) {
  var dropBlogs = function() { return schema.dropTable('blogs'); };
  var dropArticles = function() { return schema.dropTable('articles'); };
  return dropArticles().then(dropBlogs);
};
```

### Many-to-Many

Many to many relationships are supported via the use of a [_through_](#through)
option on a [`hasMany`](#-hasmany-).


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

- [`Doctor#patients`](#-associations-)
- [`Doctor#patientObjects`](#-associationobjects-)
- [`Doctor#createPatient()`](#-createassociation-)
- [`Doctor#addPatient()`](#-addassociation-)
- [`Doctor#addPatients()`](#-addassociations-)
- [`Doctor#removePatient()`](#-removeassociation-)
- [`Doctor#removePatients()`](#-removeassociations-)
- [`Doctor#clearPatients()`](#-clearassociations-)


- [`Patient#doctors`](#-associations-)
- [`Patient#doctorObjects`](#-associationobjects-)
- [`Patient#createDoctor()`](#-createassociation-)
- [`Patient#addDoctor()`](#-addassociation-)
- [`Patient#addDoctors()`](#-addassociations-)
- [`Patient#removeDoctor()`](#-removeassociation-)
- [`Patient#removeDoctors()`](#-removeassociations-)
- [`Patient#clearDoctors()`](#-clearassociations-)

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

- [`Appointment#doctor`](#-association-)
- [`Appointment#doctorId`](#-associationid-)
- [`Appointment#createDoctor()`](#-createassociation-)
- [`Appointment#fetchDoctor()`](#-fetchassociation-)


- [`Appointment#patient`](#-association-)
- [`Appointment#patientId`](#-associationid-)
- [`Appointment#createPatient()`](#-createassociation-)
- [`Appointment#fetchPatient()`](#-fetchassociation-)

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
exports.up = function(schema) {
  var createDoctors = function() {
    return schema.createTable('doctors', function(table) {
      table.serial('id').primaryKey();
      table.string('name');
    });
  };

  var createPatients = function() {
    return schema.createTable('patients', function(table) {
      table.serial('id').primaryKey();
      table.string('name');
    });
  };

  var createAppointments = function() {
    return schema.createTable('appointments', function(table) {
      table.serial('id').primaryKey();
      table.dateTime('occursAt');
      table.integer('doctor_id').references('doctors.id');
      table.integer('patient_id').references('patients.id');
    });
  };

  return createDoctors().then(createPatients).then(dropAppointments);
};

exports.down = function(schema) {
  var dropDoctors = function() { return schema.dropTable('doctors'); };
  var dropPatients = function() { return schema.dropTable('patients'); };
  var dropAppointments = function() { return schema.dropTable('appointments'); };
  return dropAppointments().then(dropPatients).then(dropDoctors);
};
```

It is not necessary to actually define the model through which the many-to-many
relationship is built. For instance, if you built a relationship between
_assemblies_ and _parts_, you could just do:

```js
var Assembly = db.model('assembly', {
  name: db.attr(),
  assmeblies: db.hasMany({ through: 'assmeblies_parts' })
});

var Part = db.model('part', {
  partNumber: db.attr(),
  parts: db.hasMany({ through: 'assmeblies_parts' })
});
```

Note, though, that the `assmeblies_parts` join table must be created in a
migration.

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

Content coming soon&hellip;

## Methods

### `#belongsTo`

A belongs-to relationship adds the following properties and methods:

`association` is a placeholder for the name of the belongs-to relation being
defined. If the name of the relation was `author`, i.e.
`Model.reopen({ author: db.belongsTo() })`, then `fetchAuthor` would be one of
the methods added to `Model`.

- [`association`](#-association-)
- [`associationId`](#-associationid-)
- [`createAssociation()`](#-createassociation-)
- [`fetchAssociation()`](#-fetchassociation-)

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

- `inverse` The name of the inverse relationship.
- `primaryKey` The name of the primary key in the relationship.
- `foreignKey` The name of the foreign key in the relationship.

#### `#association`

Access the relation. This will throw an error if the relation has not yet been
loaded. Load the association before accessing it using
[`with`][azul-queries#with] or via [`fetchAssociation`](#-fetchassociation-).

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
  author: db.belongsTo({ foreignKey: 'writer_id' })
});

Article.objects.with('author').find(1).then(function(article) {
  article.author; // => [Author { id: 7 }]
  article.writerId; // => 7
});
// assuming article 1 is written by person 7
```

#### `#createAssociation`

Create a new object of the relationship type.

```js
var blog = article.createBlog({ title: 'Blog' });
```

#### `#fetchAssociation`

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
[`association`](#-association-) property.

```js
Article.objects.find(1).tap(function(article) {
  return article.fetchBlog();
})
.then(function() {
  console.log(article.blog);
});
// see bluebird.js for details on tap
```

### `#hasMany`

A has-many relationship adds the following properties and methods:

`association` is a placeholder for the name of the has-many relation being
defined. If the name of the relation was `articles`, i.e.
`Model.reopen({ articles: db.hasMany() })`, then `clearArticles` would be one
of the methods added to `Model`.

- [`associations`](#-associations-)
- [`associationObjects`](#-associationobjects-)
- [`createAssociation()`](#-createassociation-)
- [`addAssociation()`](#-addassociation-)
- [`addAssociations()`](#-addassociations-)
- [`removeAssociation()`](#-removeassociation-)
- [`removeAssociations()`](#-removeassociations-)
- [`clearAssociations()`](#-clearassociations-)

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

- `inverse` The name of the inverse relationship.
- `primaryKey` The name of the primary key in the relationship.
- `foreignKey` The name of the foreign key in the relationship.
- `through` Specify the name of a relationship through which this collection is
accessed.
- `source` When using `through` this is the name of the relationship on the
destination model. The default value is the name of the attribute for the
relationship.

#### `#associations`

Access the related items. This will throw an error if the relation has not yet
been loaded. Load the association before accessing it using
[`with`][azul-queries#with] or via
[`associationObjects.fetch`](#-associationObjects-).

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
[`associations`](#-associations-) property.

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
[`associations`](#-associations-) property.

```js
Blog.objects.find(1).then(function(blog) {
  return blog.articleObjects.where({ 'title[contains]': 'Azul' });
})
.then(function(articles) {
  console.log(articles);
});
```

#### `#createAssociation`

Create a new object of the relationship type. This will also set the foreign
key on the created object.

```js
var article = blog.createArticle({ title: 'Azul' });
blog.id; // => 7
article.blogId; // => 7
```

#### `#addAssociation`

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

#### `#addAssociations`

Allows [adding](#-addassociations-) of multiple associations. Pass an array or
multiple arguments.

```js
blog.addArticles([article1, article2]);
blog.addArticles(article1, article2);
```

#### `#removeAssociation`

This method is used to remove objects to the relationship. The changes will
remain in memory until [saved][azul-models#save]:

```js
Promise.all([ Article.objects.find(1), Blog.objects.find(4) ])
.spread(article, blog) {
  blog.removeArticle(article);
  return blog.save();
});
```

Like [`addAssociation()`](#-addassociation-), this method returns a _thenable_
object that simply saves the object.

#### `#removeAssociations`

Allows [removing](#-removeassociations-) of multiple associations. Pass an
array or multiple arguments.

```js
blog.removeArticles([article1, article2]);
blog.removeArticles(article1, article2);
```

#### `#clearAssociations`

Clear all related objects.

```js
blog.clearArticles();
```

[azul-models#save]: /guides/models/#-save-
[azul-queries]: /guides/queries/
[azul-queries#with]: /guides/queries/#-with-
