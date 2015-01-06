# Azul

[![NPM version][npm-image]][npm-url] [![Build status][travis-image]][travis-url] [![Code Climate][codeclimate-image]][codeclimate-url] [![Coverage Status][coverage-image]][coverage-url] [![Dependencies][david-image]][david-url] [![devDependencies][david-dev-image]][david-dev-url]

Azul has been built from the ground up to be the most expressive ORM for
Node.js.

At this point, this is a functional **alpha**. We're focusing on
creating an expressive, well documented public API and reaching feature parity
with other ORM tools. If you're interested in helping, please reach out.


## Contributing

Please join us on [HipChat](http://www.hipchat.com/g0ggZ58LV) to discuss
how to help out.

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
