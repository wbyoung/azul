'use strict';

module.exports = {
  production: {
    adapter: 'mysql',
    connection: {
      database: 'database',
      user: 'root',
      password: ''
    }
  },
  development: {
    adapter: 'mysql',
    connection: {
      database: 'database_dev',
      user: 'root',
      password: ''
    }
  },
  test: {
    adapter: 'mysql',
    connection: {
      database: 'database_test'
      user: 'root',
      password: ''
    }
  }
};
