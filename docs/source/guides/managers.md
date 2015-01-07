---
title: Managers
toc: true
active: guides
template: guide-page.html
---

# Managers

Managers allow you to pre-configure queries for collections of objects that
are frequently accessed. You can define new collections on your model and
also have the ability to override the default `objects` collection.

## Basic Example

For example, setting up custom managers to allow quick access to
`Person.men` and `Person.women` would be done like so:

```js
var Manager = azul.manager;

var FemaleManager = Manager.extend({
  query: function() {
    return this._super().where({ sex: 'female' });
  }
});

var MaleManager = Manager.extend({
  query: function() {
    return this._super().where({ sex: 'male' });
  }
});

var Person = db.model('person').reopenClass({
  women: FemaleManager.create(),
  men: MaleManager.create()
});

Person.men.where({ 'age[lt]': 12 }).fetch().then(function(people) {
  // people is all men under the age of 12
});

Person.women.where({ 'age[gt]': 25 }).fetch().then(function(people) {
  // people is all women over the age of 25
});
```

## Overriding the Default Manager

It is also possible to override the default `objects`. For instance, having an
`Article` model default to all `published` articles would be done like so:

```js
var PublishedManager = Manager.extend({
  query: function() {
    return this._super().where({ published: true });
  }
});

Article.reopenClass({
  objects: PublishedManager.create(),
  allObjects: Manager.create()
});
```

Note that `allObjects` has been added as a simple manager, so that it is still
possible to access articles that have not been published.
