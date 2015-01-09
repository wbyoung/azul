---
title: Getting Started
header: Getting Started
active: getting_started
template: page.html
---

# Getting Started

Getting started with Azul.js is quick and easy. First, you'll need to install
the library and a database adapter via `npm`. We'll use
[PostgreSQL][node-postgres] in the examples on this page, but Azul.js also
supports [MySQL][node-mysql] and [SQLite3][node-sqlite3]. You'll also want to
install Azul.js globally to have easy access to the `azul` command line tool.

```bash
$ npm install azul pg --save
$ npm install azul --global
```

## Configuration

An `azulfile` allows your application and the `azul` command line tool to share
connection settings. To create the `azulfile`, simply run:

```bash
$ azul init postgresql # or mysql, sqlite
```

This configuration file allows the `azul` command line application to connect
to your database when performing housekeeping operations on your behalf.

Your application also connects to the database, and will use this file as well
when you [configure your application](#application).

Azul won't create databases for you automatically, so don't forget to do that:

```bash
$ createuser -s root
$ psql -U root -d postgres
> CREATE DATABASE my_database;
> \q
```

Your configuration file contains connection settings for _production_,
_development_, and _test_. The `NODE_ENV` environment variable can then be used
to control the environment & connection settings when running `azul` on the
command line.

The `azulfile` can be either a _JSON_ or _JavaScript_ file that exports the
configuration.

## Application

With your configuration file in place, a simple application can be built using
that configuration file.

```js
// get the database configuration for the current environment
var env = process.env.NODE_ENV || 'development';
var config = require('./azulfile')[env];

var azul = require('azul');
var db = azul(config);

var Article = db.model('article', {
  name: db.attr()
});
```

Once your application is configured, you can proceed by setting up
[migrations][azul-migrations] and [models][azul-models].


[node-postgres]: https://github.com/brianc/node-postgres
[node-mysql]: https://github.com/felixge/node-mysql/
[node-sqlite3]: https://github.com/mapbox/node-sqlite3

[azul-migrations]: /guides/migrations/
[azul-models]: /guides/models/
