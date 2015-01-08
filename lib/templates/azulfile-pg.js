'use strict';

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
