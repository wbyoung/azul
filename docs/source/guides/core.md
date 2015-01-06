---
title: Core
toc: true
active: guides
template: guide-page.html
---

# Azul.js Core

This page contains documentation for basic core functionality from Azul.js that
is relevant for developers using the library.

## Objects

Azul.js provides methods for creating an object-oriented class hierarchy that
is similar to other JavaScript libraries. It is heavily influenced by
[`Ember.Object`][ember-object].

### Creating Instances

Instances can be instantiated via the `create` class method and will cause the
`init` method to be called with the same arguments. For instance:

```js
var Person = Class.extend({
  init: function(firstName, lastName) {
    console.log('creating the person %s %s', firstName, lastName);
  }
});

var person = Person.create('Whitney', 'Young');
```

### Extending Classes

The base class object, `Class` is accessible for you to extend. For instance:

```js
var azul = require('azul'),
    Class = azul.core.Class;

var Person = Class.extend({
  speak: function() {
    console.log('hello world');
  }
});
```

#### Instance Methods

Instance methods can be added via `reopen`:

```js
Person.reopen({
  walk: function() {
    console.log('The person is walking');
  }
});

var person = Person.create();
person.walk();
```

Instance methods can also be added via the first argument to `Class.extend` as
shown above in [Creating Instances](#creating-instances).

#### Class Methods

Class methods, or static methods, can be added to a class via `reopenClass`:

```js
Person.reopenClass({
  createWoman: function() {
    return Person.create({ gender: 'female' });
  },
  createMan: function() {
    return Person.create({ gender: 'male' });
  }
});
```

Class methods can also be added via the second argument to `Class.extend`.

#### Calling `_super`

All methods can call `_super` to call the method that was previously defined on
the class or parent class.

#### Mixins

When calling `_super`, most object-oriented systems will attempt to call the
method from the parent class. Azul's `_super` will call the method that it
_overrides_. That method could actually be on the _same class_ rather than the
parent class. This allows you to easily program with a mixin style:

```js
var Mixin = azul.core.Mixin;

var ValidationMixin = Mixin.create({
  save: function() {
    if (!this.validateForSave()) {
      throw new Error('Validation failed!');
    }
    return this._super();
  }
});

var Article = db.model('article', {
  updatedAt: db.attr(),

  save: function() {
    this.updatedAt = new Date();
    return this._super();
  }
});

Article.reopen(ValidationMixin);
```

In this case, save methods will be called in this order:

  1. `ValidationMixin#save` (because it was added last)
  1. `Article#save` (overridden by `ValidationMixin`)
  1. `Model#save` (overridden by `Article` class)

#### Properties

Properties can easily be added to objects as well. Imagine a person who has a
given first and last names that cannot change throughout their lifetime, but
also has a nickname that can change:

```js
var property = azul.core.property;

var Person = Class.extend({
  init: function(firstName, lastName) {
    this._firstName = firstName;
    this._lastName = lastName;
  },

  nickname: property(function() { // getter
    return this._nickname;
  }, function(nickname) { // setter
    this._nickname = nickname;
  }),

  // alternative, simpler nickname definition:
  // nickname: property({ writable: true }),

  firstName: property(),
  lastName: property(),

  fullName: property(function() { // getter only (readonly)
    var first = this.nickname || this.firstName;
    var last = this.lastName;
    return first + ' ' + last;
  })
});
```

[ember-object]: http://emberjs.com/guides/object-model/classes-and-instances/
