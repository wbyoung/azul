---
title: Azul.js
home: true
template: base.html
---

# Simple API

Azul.js exposes a simple API that follows patterns found in popular tools
available in other languages. You'll feel right at home when working with
Azul.js.


```js
var Article = db.model('article', {
  title: db.attr(),
  author: db.belongsTo('user')
});

var User = db.model('user', {
  name: db.attr(),
  username: db.attr(),
  articles: db.hasMany('article', { inverse: 'author' })
});

Article.objects.with('author').fetch().then('...');
// -> select * from "articles";
// -> select * from "users" where "id" in (?, ?, ?) limit 3;
// !> [3,5,8]
```
