'use strict';

module.exports = {
  production: {
    adapter: 'sqlite3',
    connection: {
      filename: './.production.sqlite3'
    }
  },
  development: {
    adapter: 'sqlite3',
    connection: {
      filename: './.development.sqlite3'
    }
  },
  test: {
    adapter: 'sqlite3',
    connection: {
      filename: './.test.sqlite3'
    }
  }
};
