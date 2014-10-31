'use strict';

/* global db, select, update, Model, Manager, hasMany, belongsTo, w, f, User */
function dontRun() {

// db abstraction layer

select('users').join('posts', 'users.id', 'posts.user_id'); // select * from users left join posts on users.id = posts.user_id;
select('users').join('posts'); // select * from users left join posts on users.id = posts.user_id;

// REVISIT: distinct
// REVISIT: return values (rather than objects)

// types

var table;
table.auto('id');
table.integer('name');
table.integer64('name');
table.binary('name');
table.bool('name');
table.string('name');
table.text('name');
table.date('name');
table.time('name');
table.dateTime('name'); // REVISIT: at model level support { autoNow: false, autoNowAddd: false }
table.decimal('name');

update('people').set({ name: 'Whit' }).where({ id: '1' });

// REVISIT: testing. here are some things to consider
//   - handle insert of objects with specific IDs
//   - handle reseting sequence ids for testing

var query = w({ 'id[gte]': 4 }, w.and, w({ name: 'Whit' }, w.or, { name: 'Brit' }));
// id >= $1 && (name = $2 || name = $3) [4, 'Whit', 'Brit']

update('people').set({ fullName: f('firstName + " " + lastName') });


// orm layer

// REVISIT: validations (before/after save, before/after update, before/after destroy)
// REVISIT: polymorphic
// REVISIT: inherited
// REVISIT: aggregation
// REVISIT: transactions
// REVISIT: events/hooks for logging
// REVISIT: raw that returns real model objects & raw that returns just js objects
// REVISIT: all association types & through associations + convenience methods for associations
// REVISIT: feature like scope in rails or just use django manager style

// REVISIT: allow pk override
// REVISIT: allow table name override

var FemaleManager = Manager.extend({
  querySet: function() {
    return this._super().where({ sex: 'female' });
  }
});

var MaleManager = Manager.extend({
  querySet: function() {
    return this._super().where({ sex: 'male' });
  }
});

var Person = Model.extend('person', {
  posts: hasMany('posts')
}, {
  women: FemaleManager,
  men: MaleManager,
  objects: Manager // could customize...
});

var Post = Model.extend('post', {
  author: belongsTo('person', { key: 'user_id', foreignKey: 'id' })
});


var person, post, post1, post2;

person = Person.create({ name: 'Whitney' });
person.save().then('...'); // insert into people (name) values "$1" ["Whitney"]

// REVISIT: createOrUpdate()

// or can this use real property setting?
person.set('name', 'Whit'); // update people set name = 'Whit' where id = 1;


Post.objects.all().then('...'); // select * from posts;
Post.objects.where({ pk: 1 }).fetch().then('...'); // select * from posts where posts.id = 1;
Post.objects.with('author').fetch().then('...'); // select * from posts left join people on posts.user_id = user.id;
Post.objects.with('author').fetch().then('...'); // select * from posts left join people on posts.user_id = user.id;
Post.objects.with('author', 'comments').fetch().then('...'); // select * from posts left join people on posts.user_id = user.id; REVISIT: more query for second relation

// REVISIT: consider more active record approach than django approach where there are no managers, and
// Post.objects.... becomes Post.all() or Post.where....
// REVISIT: consider Post.objects.first()
// REVISIT: consider helper methods like Post.objects.find_by_title() returning just one (exception for 0 or many) by title
// REVISIT: events/hooks for lifecycle and/or validation


// REVISIT: support difference between join queries and prefetching?

Post.objects.update({ 'title': 'What' }); // update posts set title = 'What'
Post.objects.with('author').update({ 'title': f('title + " "') }); // update posts left join poeple on posts.user_id = user.id

Post.objects.delete(); // delete from posts;
post.delete(); // delete from posts where id = 2;

Post.objects.where({ 'author.name[contains]': 'Whit' }).fetch().then('...');
// select * from posts left join people on posts.user_id = user.id where people.name like $1 ["Whit"];
Post.objects.where({ 'author.name[contains]': 'Whit' }).fetchOne().then('...'); // throws if not exactly one record
// select * from posts left join people on posts.user_id = user.id where people.name like $1 ["Whit"];
Post.objects.where({ 'author.name[contains]': 'Whit' }).orderBy('name', 'desc').limit(10).offset(20).fetch().then('...');
// select * from posts left join people on posts.user_id = user.id where people.name like $1 order by name desc limit 10 offset 20 ["Whit"];


post = Post.create({ title: 'Example' });
person.posts.add(post).then('...'); // insert into posts (title, person_id) values $1, $2 ["Example", 1]
person.posts.create({ title: 'Example' }).then('...'); // insert into posts (title, person_id) values $1, $2 ["Example", 1]

person.posts.add(post1, post2).then('...'); // insert into posts (title, person_id) values ($1, $2), ($3, $4) ["Example1", 1, "Example2", 1]
person.posts.remove(post1, post2).then('...'); // update posts set id = null where person_id = 1 and id in $1 [1, 2]
person.posts.clear().then('...'); // update posts set id = null where person_id = 1

post = person.posts.create({ title: 'Example' }).then('...'); // insert into posts (title, person_id) values $1, $2 ["Example", 1]


var qs = Post.objects.all();
qs.fetch(); // runs query
qs.fetch(); // pulls from cache (this could be optional)

qs.clone(); // creates duplicate that you can do different things with (generally not needed because each call would clone the query set)




// REVISIT: express transaction middleware

// transactions will consume a database transaction until committed/rolled back
var asyncOperation;

// REVISIT: the saves/fetches are not able to be added to this transaction in any way
var transaction = db.transaction();
Person.where('...').fetch().then(function(person) { person.set('name', 'Jim'); return person.save(); })
.then(function(person) { return person.get('comments'); })
.then(function(comments) { comments.at(0).set('body', 'hello'); return comments.at(0).save(); })
.then(function() { transaction.commit(); });

Promise.bind({})
.then(function() { return db.transaction(); })
.then(function(transaction) { this.parentTransaction = transaction; })
.then(function() { return Person.where('...').transaction(this.parentTransaction).fetch(); })
.then(function() { return asyncOperation(); })
.then(function() { return db.transaction({ parent: this.parentTransaction }); })
.then(function(transaction) { this.childTransaction = transaction; })
.then(function() { return asyncOperation(); })
.then(function() { return Person.where('...').transaction(this.childTransaction).fetch(); })
// .then(function() { return Person.where('...').transaction(this.parentTransaction).fetch(); }) // this would throw an error because the child is not closed
// .then(function() { return this.parentTransaction.commit(); }) // this would auto-commit the child
.then(function() { return this.childTransaction.commit(); })
.then(function() { return this.parentTransaction.commit(); });

// this would be a more ideal syntax, but may require monkeying with promises in some way.
// this also better supports the ability to handle saves/fetches in the same way (especially when they may be implicit for relationships).
db.transaction.begin()
.then(function() {
  return Person.where('...').fetch(); // part of transaction because returned from a then
})
.done(); // commits transaction (or rolls back if error)

// REVISIT: does this rely too heavily on bluebird feature set by assuming a binding via `this`?
// can this be combined with the ideas from above of creating a transaction object to allow a more explicit use of transactions as well as explicitly setting transactions in queries, but also this more convenient way?
db.transaction.begin()
.then(function() { return db.transaction.begin(); }) // nested transaction
.then(function() { return db.transaction.begin(); }) // 2nd nested transaction
.then(function() { this.transaction.commit(); }) // REVISIT: i don't love this idea, but it's growing on me. perhaps nesting should be accomplished in another way?
.then(function() { this.transaction.commit(); }) // close second
.done(); // commits transaction (or rolls back if error)

// REVISIT:
// queries bound to a transaction that aren't executed until after the transaction is closed
// would have to throw an error.

// REVISIT:
// would it be easier for each iteration through the run loop to get a new shared connection?
// this would mean that all queries that are created back to back would enter the same connection
// and basically be serial. this may be something that would have to be disabled, but it could also
// cause problems if someone tried to do something that they expected to be on a new connection that
// occurred a little too early (they did something like process.nextTick & it got in before our stuff).

db.serial(function() {
  // anything executed synchronously in here will automatically be added to the serial operation
  // any use of then on an executed query within a serial callback would result in an error (which would limit its practicality
  // and/or cause problems when blanket applying it to migrations -- migrations could opt out, though).
}); // returns a promise that resolves to an array. each item in the array is the result of one of the database queries.

// REVISIT: this may not be needed
db.serial(function(queue, done) {
  queue.add('...'.fetch());
  queue.add('...'.fetch());
  done(); // returns a promise
}); // returns the same promise

var createTable, createJoinTable;


// migrations
// migrations must run within both a transaction and a serial wrapper
// change handle both up and down (reversible) migrations
exports.change = function() {
  createTable('people', function(table) {
    table.string('name');
    table.text('something');
    table.timestamps();
  });
  createTable('posts', function(table) {
    table.references('person');
  });
  createTable('things');
  createJoinTable('author', 'book');
};

exports.serialEnabled = false; // disable automatic serial wrapping for this migration
exports.transactionEnabled = false; // disable automatic transaction wrapping for this migration

// separate up/down migrations (throws with change defined as well)
exports.up = function() {

};
exports.down = function() {

};

// simple transaction support with automatic automatically added to transaction, commit & rollback on exceptions
db.transaction(function() {
  db.transaction(function() {
  });
});

// simple transaction support with queries automatically added to transaction
db.transaction(function(a) {
  a.commit();
  db.transaction(function(b) {
    b.rollback();
  });
});

// exception thrown because transaction not committed at the end of the callback.
// asynchronous operations via transactions are not supported via the callback and
// instead must use the result variable and explicitly add queries to the transaction
// via the query interface.
db.transaction(function(transaction) {
  /* jshint unused:false */
});

// other errors:
qs = User.where('...');
db.transaction(function() {
  db.transaction(function() {
    User.where('...').transaction(null).fetch(); // not in transaction (or throws an error)
    qs.fetch(); // not in transaction (or throws an error)
  });
});


// // mysql operators

//         'exact': '= %s',
//         'iexact': 'LIKE %s',
//         'contains': 'LIKE BINARY %s',
//         'icontains': 'LIKE %s',
//         'regex': 'REGEXP BINARY %s',
//         'iregex': 'REGEXP %s',
//         'gt': '> %s',
//         'gte': '>= %s',
//         'lt': '< %s',
//         'lte': '<= %s',
//         'startswith': 'LIKE BINARY %s',
//         'endswith': 'LIKE BINARY %s',
//         'istartswith': 'LIKE %s',
//         'iendswith': 'LIKE %s',

// // PG operators

//         'exact': '= %s',
//         'iexact': '= UPPER(%s)',
//         'contains': 'LIKE %s',
//         'icontains': 'LIKE UPPER(%s)',
//         'regex': '~ %s',
//         'iregex': '~* %s',
//         'gt': '> %s',
//         'gte': '>= %s',
//         'lt': '< %s',
//         'lte': '<= %s',
//         'startswith': 'LIKE %s',
//         'endswith': 'LIKE %s',
//         'istartswith': 'LIKE UPPER(%s)',
//         'iendswith': 'LIKE UPPER(%s)',

// // sqlite3 operators

//         'exact': '= %s',
//         'iexact': "LIKE %s ESCAPE '\\'",
//         'contains': "LIKE %s ESCAPE '\\'",
//         'icontains': "LIKE %s ESCAPE '\\'",
//         'regex': 'REGEXP %s',
//         'iregex': "REGEXP '(?i)' || %s",
//         'gt': '> %s',
//         'gte': '>= %s',
//         'lt': '< %s',
//         'lte': '<= %s',
//         'startswith': "LIKE %s ESCAPE '\\'",
//         'endswith': "LIKE %s ESCAPE '\\'",
//         'istartswith': "LIKE %s ESCAPE '\\'",
//         'iendswith': "LIKE %s ESCAPE '\\'",

console.log(query + transaction);

}
if (dontRun) {}