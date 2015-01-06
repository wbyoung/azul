---
title: Getting Started
header: Getting Started
active: getting_started
template: page.html
---

# Getting Started

Getting started with Azul.js is quick and easy. First, you'll need to install
the library and a database adapter via `nmp`. We'll use
[PostgreSQL][node-postgres] in this example, but Azul.js also supports
[MySQL][node-mysql] and [SQLite3][node-sqlite3]. You'll also want to install
Azul.js globally to have easy access to the `azul` command line tool.

```bash
$ npm install --save azul pg
$ npm install --global azul
```

## Configuration

Both your application and the `azul` command line application will need a way
to connect to your database in order to update the database. The `azul` command
line tool will connect to the database when running
[migrations][azul-migrations] to alter your database schema.
And your application will obviously connect to the database to manipulate the
underlying data. A shared configuration file, the `azulfile` is used for both.
We recommend having separate configurations for _production_, _development_,
and _test_. The `NODE_ENV` environment variable can then be used to control the
environment.


```js
module.exports = {
  production: {
    adapter: 'pg',
    connection: {
      database: 'database',
      user: 'root',
      password: ''
    }
  },
  development: {
    adapter: 'pg',
    connection: {
      database: 'database_dev',
      user: 'root',
      password: ''
    }
  },
  test: {
    adapter: 'pg',
    connection: {
      database: 'database_test'
      user: 'root',
      password: ''
    }
  }
};
```

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

[azul-migrations]: /guides/migrations.html
[azul-models]: /guides/models.html
