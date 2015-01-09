---
title: Azul.js
active: home
template: home.html
---

<h1 id="overview"></h1>

# Start Quickly

Azul is easy to [install and start using][azul-getting-started].

```bash
$ npm install azul -g
$ npm install azul
$ azul init
```

Give it a try today!

# Work Efficiently

Azul.js exposes a simple API that follows patterns found in popular tools
available in other languages. You'll feel right at home when working with
Azul.js. Even if you haven't worked with other ORMs, our
[documentation][azul-getting-started] is top notch, so you'll be building
stellar apps in no time.

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

# Express Yourself

Azul.js was designed to be the most expressive ORM for Node.js. You'll write
good code that others can easily understand. Want to find all articles that
include a comment that is spam? Simple.

```js
Article.objects.where({ 'comments.spam': true }).fetch().then('...');

// -> select "articles".* from "articles"
// -> inner join "comments" on "comments"."article_id" = "articles"."id"
// -> where "comments"."spam" = ?
// -> group by "articles"."id"
// !> [true]
```

[azul-getting-started]: /getting-started/
