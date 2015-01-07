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

#### `#association`
#### `#associationId`
#### `#createAssociation`
#### `#fetchAssociation`

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

#### `#associations`
#### `#associationObjects`
#### `#createAssociation`
#### `#addAssociation`
#### `#addAssociations`
#### `#removeAssociation`
#### `#removeAssociations`
#### `#clearAssociations`
