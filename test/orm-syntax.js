'use strict';

/* global select, update, Model, Manager, hasMany, belongsTo, w, f */
function dontRun() {

// db abstraction layer

select('users').join('posts', 'users.id', 'posts.user_id'); // select * from users left join posts on users.id = posts.user_id;
select('users').join('posts'); // select * from users left join posts on users.id = posts.user_id;

// REVISIT: distinct
// REVISIT: return values (rather than objects)
// REVISIT: express transaction middleware (every request wrapped in a transaction)

// types

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


console.log(query);

}
if (dontRun) {}