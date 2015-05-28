# Azul

[![NPM version][npm-image]][npm-url] [![Build status][travis-image]][travis-url] [![Code Climate][codeclimate-image]][codeclimate-url] [![Coverage Status][coverage-image]][coverage-url] [![Dependencies][david-image]][david-url] [![devDependencies][david-dev-image]][david-dev-url]

Azul has been built from the ground up to be the most expressive ORM for
Node.js.

## Get Started

```bash
$ npm install azul -g
$ npm install azul
$ azul init
```

The current release of Azul.js is a functional **alpha**. We're looking for
feedback at this point, so please [look at the docs][azul-docs] and give it a
try.

We're focusing on creating an expressive, well [documented public
API][azul-docs] and reaching feature parity with other ORM tools. If you're
interested in helping, please reach out.

### Addons

A few additional components that you can use with Azul.js are:

- [Azul.js Express][azul-express] Middleware & decorators for Express
- [Azul.js Logger][azul-logger] Logs queries being executed
- [Azul.js Tracker][azul-tracker] Reports queries that were created, but never
  executed

### Testing

Simply run `gulp test` to run the full test suite.

This build currently connects to databases for testing purposes. To replicate this on your machine, do the following:

#### Postgres

```bash
$ createuser -s root
$ psql -U root -d postgres
> CREATE DATABASE azul_test;
> \q
```

#### MySQL

```bash
$ mysql -u root
> CREATE DATABASE azul_test;
> exit
```
### Documentation

Generate and access documentation locally:

```bash
$ jsdoc --private -c jsdoc.json
$ open out/index.html
```

## License

This project is distributed under the MIT license.

[azul-docs]: http://www.azuljs.com/
[azul-express]: https://github.com/wbyoung/azul-express
[azul-logger]: https://github.com/wbyoung/azul-logger
[azul-tracker]: https://github.com/wbyoung/azul-tracker

[travis-image]: http://img.shields.io/travis/wbyoung/azul.svg?style=flat
[travis-url]: http://travis-ci.org/wbyoung/azul
[npm-image]: http://img.shields.io/npm/v/azul.svg?style=flat
[npm-url]: https://npmjs.org/package/azul
[codeclimate-image]: http://img.shields.io/codeclimate/github/wbyoung/azul.svg?style=flat
[codeclimate-url]: https://codeclimate.com/github/wbyoung/azul
[coverage-image]: http://img.shields.io/coveralls/wbyoung/azul.svg?style=flat
[coverage-url]: https://coveralls.io/r/wbyoung/azul
[david-image]: http://img.shields.io/david/wbyoung/azul.svg?style=flat
[david-url]: https://david-dm.org/wbyoung/azul
[david-dev-image]: http://img.shields.io/david/dev/wbyoung/azul.svg?style=flat
[david-dev-url]: https://david-dm.org/wbyoung/azul#info=devDependencies
