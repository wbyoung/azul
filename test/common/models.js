'use strict';

require('../helpers');

module.exports = function() {
  /* global db, adapter */

  var attr = db.attr;
  var hasMany = db.hasMany;
  var hasOne = db.hasOne;
  var belongsTo = db.belongsTo;

  // blog models: user, blog, article, comment
  // users each have their own blog, but can write articles for other blogs
  db.model('user', {
    username: attr(),
    email: attr('email_addr'),
    blog: hasOne({ inverse: 'owner' }),
    articles: hasMany({ inverse: 'author' }),
    comments: hasMany({ inverse: 'commenter' }),
    feedback: hasMany('comments', { through: 'articles', source: 'comments' }),
    ownArticles: hasMany('articles', { through: 'blog', source: 'articles' }),
    otherBlogs: hasMany('blogs', { through: 'articles', source: 'blog' }),
  });
  db.model('blog', {
    title: attr(),
    owner: belongsTo('user'),
    articles: hasMany(),
    comments: hasMany({ through: 'articles' }),
  });
  db.model('article', {
    title: attr(),
    blog: belongsTo(),
    comments: hasMany(),
    author: belongsTo('user'),
    authorId: attr('author_identifier'),
  });
  db.model('comment', {
    body: attr(),
    article: belongsTo('article'),
    commenter: belongsTo('user'),
  });

  adapter.respond(/select.*from "users"/i, [
    { id: 231, username: 'jack', 'email_addr': 'jack@gmail.com' },
    { id: 844, username: 'susan', 'email_addr': 'susan@gmail.com' },
  ]);
  adapter.respond(/select.*from "users".*limit 1/i, [
    { id: 231, username: 'jack', 'email_addr': 'jack@gmail.com' },
  ]);
  adapter.sequence(/insert into "users".*returning "id"/i, 398);
  adapter.respond(/select.*from "blogs"/i, [
    { id: 348, title: 'Azul.js', 'owner_id': 231 },
    { id: 921, title: 'Maguey', 'owner_id': undefined },
  ]);
  adapter.respond(/select.*from "blogs".*limit 1/i, [
    { id: 348, title: 'Azul.js', 'owner_id': 231 },
  ]);
  adapter.sequence(/insert into "blogs".*returning "id"/i, 823);
  adapter.sequence(/insert into "articles".*returning "id"/i, 199);
  adapter.sequence(/insert into "comments".*returning "id"/i, 919);

  // school models: student, course, enrollment
  db.model('student', {
    name: attr(),
    enrollments: hasMany(),
    courses: hasMany({ through: 'enrollments' }),
  });
  db.model('course', {
    subject: attr(),
    enrollments: hasMany(),
    students: hasMany({ through: 'enrollments' }),
  });
  db.model('enrollment', {
    date: attr(),
    student: belongsTo(),
    course: belongsTo(),
  });

  // company models: employee
  db.model('employee', {
    subordinates: hasMany('employee', { inverse: 'manager' }),
    manager: belongsTo('employee', { inverse: 'subordinates' }),
  });

  // manufacturing models: supplier, account, accountHistory
  db.model('supplier', {
    name: attr(),
    account: hasOne(),
    accountHistory: hasOne({ through: 'account' }),
  });
  db.model('account', {
    name: attr(),
    supplier: belongsTo(),
    accountHistory: hasOne(),
  });
  db.model('accountHistory', {
    details: attr(),
    account: belongsTo(),
  });

  adapter.respond(/select.*from "suppliers"/i, [
    { id: 229, name: 'Bay Foods' },
    { id: 430, name: 'Natural Organics' },
  ]);
  adapter.respond(/select.*from "accounts"/i, [
    { id: 392, name: 'Bay Foods Account', 'supplier_id': 229 },
    { id: 831, name: 'Natural Organics Account', 'supplier_id': 430 },
  ]);
  adapter.respond(/select.*from "account_histories"/i, [
    { id: 832, details: 'many details', 'account_id': 392 },
  ]);

  // programming models: node
  db.model('node', {
    parent: belongsTo('node', { inverse: 'nodes' }),
    nodes: hasMany('node', { inverse: 'parent' }),
  });

  // social model: person
  db.model('person', {
    name: attr(),
    bestFriendOf: hasMany('person', { inverse: 'bestFriend' }),
    bestFriend: belongsTo('person', { inverse: 'bestFriendOf' }),
  });

  adapter.sequence(/insert into "people".*returning "id"/i, 102);

  // social model: individual, relationship
  db.model('individual', {
    name: attr(),
    followers: hasMany('individual', { through: 'passiveRelationship' }),
    following: hasMany('individual', {
      through: 'activeRelationships',
      source: 'followed',
    }),
    activeRelationships: hasMany('relationship', { inverse: 'follower' }),
    passiveRelationships: hasMany('relationship', { inverse: 'followed' }),
  });
  db.model('relationship', {
    follower: belongsTo('individual'),
    followed: belongsTo('individual'),
  });

  adapter.sequence(/insert into "individuals".*returning "id"/i, 102);
};
