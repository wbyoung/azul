# Azul

[![NPM version][npm-image]][npm-url] [![Build status][travis-image]][travis-url] [![Code Climate][codeclimate-image]][codeclimate-url] [![Coverage Status][coverage-image]][coverage-url] [![Dependencies][david-image]][david-url] [![devDependencies][david-dev-image]][david-dev-url]

Azul has been built from the ground up to be the most expressive ORM for
Node.js.

At this point, this is still a **work in progress** that is focusing on
creating an expressive, well documented public API and reaching feature parity
with other ORM tools. If you're interested in helping, please reach out.


## Contributing

### Testing

This build currently connects to a postgres database for testing purposes. To replicate this on your machine, do the following:

```bash
$ createuser -s root
$ psql
$ psql -U root -d postgres
$ gulp test
```


## License

This project is distributed under the MIT license.

[travis-url]: http://travis-ci.org/wbyoung/azul
[travis-image]: https://secure.travis-ci.org/wbyoung/azul.png?branch=master
[npm-url]: https://npmjs.org/package/azul
[npm-image]: https://badge.fury.io/js/azul.png
[codeclimate-image]: https://codeclimate.com/github/wbyoung/azul.png
[codeclimate-url]: https://codeclimate.com/github/wbyoung/azul
[coverage-image]: https://coveralls.io/repos/wbyoung/azul/badge.png
[coverage-url]: https://coveralls.io/r/wbyoung/azul
[david-image]: https://david-dm.org/wbyoung/azul.png?theme=shields.io
[david-url]: https://david-dm.org/wbyoung/azul
[david-dev-image]: https://david-dm.org/wbyoung/azul/dev-status.png?theme=shields.io
[david-dev-url]: https://david-dm.org/wbyoung/azul#info=devDependencies
