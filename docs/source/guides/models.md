---
title: Models
toc: true
active: guides
template: page.html
---

# Models

## Defining Models

### Quick Example

Models are easy to define with Azul.js. This example defines an Author who has
a `firstName` and `lastName`:

```js
var Author = db.model('author', {
  firstName: db.attr(),
  lastName: db.attr()
});
```

### Field Types

#### `auto`

#### `increments`

#### `serial`

#### `integer`

#### `integer64`

#### `string`

#### `text`

#### `binary`

#### `bool`

#### `date`

#### `time`

#### `dateTime`

#### `float`

#### `decimal`

## Saving Models

### Insert or Update?
