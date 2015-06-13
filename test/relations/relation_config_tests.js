'use strict';

require('../helpers');

describe('relation configuration', __db(function() {
  /* global db */

  var attr, hasMany, hasOne, belongsTo;

  beforeEach(require('../common').models);
  beforeEach(function() {
    attr = db.attr;
    hasMany = db.hasMany;
    hasOne = db.hasOne;
    belongsTo = db.belongsTo;
  });

  describe('belong-to only', function() {

    it('has default values', function() {
      var Book = db.model('book', { writer: db.belongsTo() });

      Book.relations.should.have.keys('writer');
      Book.writerRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

    it('allows customization of primary key', function() {
      var Book = db.model('book', {
        writer: db.belongsTo({ primaryKey: 'primaryId' }),
      });

      Book.relations.should.have.keys('writer');
      Book.writerRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'primaryId',
        primaryKeyAttr: 'primary_id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

    it('allows customization of primary key db attr', function() {
      var Book = db.model('book', {
        writer: db.belongsTo({ primaryKey: 'primaryId' }),
      });
      db.model('writer', {
        primaryId: db.attr('primary_identifier'),
      });

      Book.relations.should.have.keys('writer');
      Book.writerRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'primaryId',
        primaryKeyAttr: 'primary_identifier',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

    it('allows customization of foreign key', function() {
      var Book = db.model('book', {
        writer: db.belongsTo({ foreignKey: 'authorId' }),
      });

      Book.relations.should.have.keys('writer');
      Book.writerRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });
    });

    it('allows customization of foreign key db attr', function() {
      var Book = db.model('book', {
        writer: db.belongsTo({ foreignKey: 'authorId' }),
        authorId: db.attr('author_identifier'),
      });

      Book.relations.should.have.keys('writer');
      Book.writerRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_identifier',
      });
    });

    it('allows customization of inverse', function() {
      var Book = db.model('book', {
        writer: db.belongsTo({ inverse: 'novels' }),
      });

      Book.relations.should.have.keys('writer');
      Book.writerRelation.should.have.properties({
        inverse: 'novels',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

    it('calculates defaults when inverse is missing', function() {
      var Book = db.model('book', { writer: db.belongsTo() });

      // disallow any additions to the writer class including the implicit
      // relation that would normally be added. while this would never happen,
      // it allows us to test that belongsTo can generate the proper default
      // keys.
      db.model('writer').reopenClass({
        reopen: function() {}
      });

      Book.writerRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });
  });

  describe('has-many only', function() {

    it('has default values', function() {
      var Writer = db.model('writer', { books: hasMany() });

      Writer.relations.should.have.keys('books');
      Writer.booksRelation.should.have.properties({
        inverse: 'writer',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

    it('allows customization of primary key', function() {
      var Writer = db.model('writer', {
        books: hasMany({ primaryKey: 'uniqueId' }),
      });

      Writer.relations.should.have.keys('books');
      Writer.booksRelation.should.have.properties({
        inverse: 'writer',
        primaryKey: 'uniqueId',
        primaryKeyAttr: 'unique_id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

    it('allows customization of primary key db attr', function() {
      var Writer = db.model('writer', {
        books: hasMany({ primaryKey: 'uniqueId' }),
        uniqueId: db.attr('unique_identifier'),
      });

      Writer.relations.should.have.keys('books');
      Writer.booksRelation.should.have.properties({
        inverse: 'writer',
        primaryKey: 'uniqueId',
        primaryKeyAttr: 'unique_identifier',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

    it('allows customization of foreign key', function() {
      var Writer = db.model('writer', {
        books: hasMany({ foreignKey: 'authorKey' }),
      });

      Writer.relations.should.have.keys('books');
      Writer.booksRelation.should.have.properties({
        inverse: 'writer',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorKey',
        foreignKeyAttr: 'author_key',
      });
    });

    it('allows customization of foreign key db attr', function() {
      var Writer = db.model('writer', {
        books: hasMany({ foreignKey: 'authorKey' }),
      });
      db.model('book', { authorKey: attr('author_num'), });

      Writer.relations.should.have.keys('books');
      Writer.booksRelation.should.have.properties({
        inverse: 'writer',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorKey',
        foreignKeyAttr: 'author_num',
      });
    });

    it('allows customization of inverse', function() {
      var Writer = db.model('writer', {
        books: hasMany({ inverse: 'author' }),
      });

      Writer.relations.should.have.keys('books');
      Writer.booksRelation.should.have.properties({
        inverse: 'author',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });
    });

    it('calculates defaults when inverse is missing', function() {
      var Writer = db.model('writer', { books: hasMany(), });

      // disallow any additions to the book class including the implicit
      // relation that would normally be added. while this would never happen,
      // it allows us to test that hasMany can generate the proper default
      // keys.
      db.model('book').reopenClass({
        reopen: function() {}
      });

      Writer.booksRelation.should.have.properties({
        inverse: 'writer',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

  });

  describe('has-one only', function() {

    it('has default values', function() {
      var Room = db.model('room', { floor: hasOne() });

      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_id',
      });
    });

    it('allows customization of primary key', function() {
      var Room = db.model('room', {
        floor: hasOne({ primaryKey: 'uniqueId' }),
      });

      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'uniqueId',
        primaryKeyAttr: 'unique_id',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_id',
      });
    });

    it('allows customization of primary key db attr', function() {
      var Room = db.model('room', {
        floor: hasOne({ primaryKey: 'uniqueId' }),
        uniqueId: db.attr('unique_identifier'),
      });

      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'uniqueId',
        primaryKeyAttr: 'unique_identifier',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_id',
      });
    });

    it('allows customization of foreign key', function() {
      var Room = db.model('room', {
        floor: hasOne({ foreignKey: 'roomKey' }),
      });

      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomKey',
        foreignKeyAttr: 'room_key',
      });
    });

    it('allows customization of foreign key and db attr', function() {
      var Room = db.model('room', {
        floor: hasOne({ foreignKey: 'roomKey' }),
      });
      db.model('floor', { roomKey: attr('room_num'), });

      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomKey',
        foreignKeyAttr: 'room_num',
      });
    });

    it('allows customization of only foreign key db attr', function() {
      var Room = db.model('room', { floor: hasOne() });
      db.model('floor', { roomId: attr('room_num') });

      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_num',
      });
    });

    it('allows customization of inverse', function() {
      var Room = db.model('room', {
        floor: hasOne({ inverse: 'ground' }),
      });

      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'ground',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'groundId',
        foreignKeyAttr: 'ground_id',
      });
    });

    it('calculates defaults when inverse is missing', function() {
      var Room = db.model('room', { floor: hasOne() });

      // disallow any additions to the book class including the implicit
      // relation that would normally be added. while this would never happen,
      // it allows us to test that hasOne can generate the proper default
      // keys.
      db.model('book').reopenClass({
        reopen: function() {}
      });

      Room.floorRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_id',
      });
    });

    it('would define no attributes when used implicitly', function() {
      // note that currently nothing actually creates implicit has-one
      // relations. this test exists for code coverage & allowing consistency
      // between has-one and other relationship types when defining overrides.
      var Room = db.model('room', { floor: hasOne({ implicit: true }) });
      var prototype = Room.__class__.prototype;
      var properties = Object.keys(prototype).filter(function(name) {
        return name.match(/floor/i);
      });
      properties.should.eql(['floorRelation']);
    });

  });

  describe('one-to-one', function() {

    it('has default values', function() {
      var Room = db.model('room', { floor: hasMany() });
      var Floor = db.model('floor', { room: belongsTo() });

      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_id',
      });

      Floor.relations.should.have.keys('room');
      Floor.roomRelation.should.have.properties({
        inverse: 'floor',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_id',
      });
    });

    it('adds implicit inverse when customized via has-one', function() {
      var Room = db.model('room', {
        floor: hasOne({ inverse: 'space' }),
      });
      var Floor = db.model('floor');

      // must test room first to trigger setup of inverse
      Room.relations.should.have.keys('floor');
      Room.floorRelation.should.have.properties({
        inverse: 'space',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'spaceId',
        foreignKeyAttr: 'space_id',
      });

      Floor.relations.should.have.keys('space');
      Floor.spaceRelation.should.have.properties({
        inverse: 'floor',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'spaceId',
        foreignKeyAttr: 'space_id',
      });
    });

    it('adds implicit inverse when customized via belongs-to', function() {
      var Room = db.model('room');
      var Floor = db.model('floor', {
        room: belongsTo({ inverse: 'ground' }),
      });

      // must test floor first to trigger setup of inverse
      Floor.relations.should.have.keys('room');
      Floor.roomRelation.should.have.properties({
        inverse: 'ground',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_id',
      });

      Room.relations.should.have.keys('ground');
      Room.groundRelation.should.have.properties({
        inverse: 'room',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'roomId',
        foreignKeyAttr: 'room_id',
      });
    });

    it('ensures primary key on belongsTo matches hasOne', function() {
      db.model('room', {
        name: db.attr('room_name'),
        floor: db.hasOne({ primaryKey: 'name' }),
      });
      var Floor = db.model('floor', {
        room: db.belongsTo({ primaryKey: 'wrong' }),
      });
      expect(function() {
        Floor.roomRelation.primaryKey;
      }).to.throw(/Floor.room.*primary key.*"name".*Room.floor/i);
    });

    it('ensures primary key on belongsTo matches value generated by hasOne', function() {
      db.model('room', {
        floor: db.hasOne(),
      });
      var Floor = db.model('floor', {
        room: db.belongsTo({ primaryKey: 'wrong' }),
      });
      expect(function() {
        Floor.roomRelation.primaryKey;
      }).to.throw(/Floor.room.*primary key.*"pk".*Room.floor/i);
    });

    it('ensures foreign key on hasOne matches belongsTo', function() {
      var Room = db.model('room', {
        floor: db.hasOne({ foreignKey: 'wrong' }),
      });
      db.model('floor', {
        room: db.belongsTo({ foreignKey: 'name' }),
      });
      expect(function() {
        Room.floorRelation.foreignKey;
      }).to.throw(/Room.floor.*foreign key.*"name".*Floor.room/i);
    });

    it('ensures foreign key on hasOne matches value generated by belongsTo', function() {
      var Room = db.model('room', {
        floor: db.hasOne({ foreignKey: 'wrong' }),
      });
      db.model('floor', {
        room: db.belongsTo(),
      });
      expect(function() {
        Room.floorRelation.foreignKey;
      }).to.throw(/Room.floor.*foreign key.*"roomId".*Floor.room/i);
    });

  });

  describe('one-to-many', function() {

    it('has default values', function() {
      var Writer = db.model('writer', { books: hasMany() });
      var Book = db.model('book', { writer: belongsTo() });

      Writer.relations.should.have.keys('books');
      Writer.booksRelation.should.have.properties({
        inverse: 'writer',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });

      Book.relations.should.have.keys('writer');
      Book.writerRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

    it('adds implicit inverse when customized via has-many', function() {
      var Writer = db.model('writer', {
        books: hasMany({ inverse: 'author' }),
      });
      var Book = db.model('book');

      // must test writer first to trigger setup of inverse
      Writer.relations.should.have.keys('books');
      Writer.booksRelation.should.have.properties({
        inverse: 'author',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });

      Book.relations.should.have.keys('author');
      Book.authorRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });
    });

    it('adds implicit inverse when customized via belongs-to', function() {
      var Writer = db.model('writer');
      var Book = db.model('book', {
        writer: belongsTo({ inverse: 'novels' }),
      });

      // must test book first to trigger setup of inverse
      Book.relations.should.have.keys('writer');
      Book.writerRelation.should.have.properties({
        inverse: 'novels',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });

      Writer.relations.should.have.keys('novels');
      Writer.novelsRelation.should.have.properties({
        inverse: 'writer',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'writerId',
        foreignKeyAttr: 'writer_id',
      });
    });

  });

  describe('many-to-many', function() {

    it('has default values', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship' }),
      });
      var Book = db.model('book', {
        authors: db.hasMany({ through: 'authorships' }),
      });
      var Authorship = db.model('authorship');

      Author.relations.should.have.keys('books', 'authorships');
      Author.booksRelation.relatedModelClass.should.equal(Book);
      Author.booksRelation.should.have.properties({
        inverse: 'authors',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });
      Author.authorshipsRelation.relatedModelClass.should.equal(Authorship);
      Author.authorshipsRelation.should.have.properties({
        inverse: 'author',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });

      Book.relations.should.have.keys('authors', 'authorships');
      Book.authorsRelation.relatedModelClass.should.equal(Author);
      Book.authorsRelation.should.have.properties({
        inverse: 'books',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'bookId',
        foreignKeyAttr: 'book_id',
      });
      Book.authorshipsRelation.relatedModelClass.should.equal(Authorship);
      Book.authorshipsRelation.should.have.properties({
        inverse: 'book',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'bookId',
        foreignKeyAttr: 'book_id',
      });

      Authorship.relations.should.have.keys('author', 'book');
      Authorship.bookRelation.should.have.properties({
        inverse: 'authorships',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'bookId',
        foreignKeyAttr: 'book_id',
      });
      Authorship.authorRelation.should.have.properties({
        inverse: 'authorships',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });
    });

    it('generates implicit relations w/ source & join specified', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship', source: 'novel' }),
        authorships: db.hasMany({ inverse: 'writer' }),
      });
      var Book = db.model('book', {
        authors: db.hasMany({ through: 'authorships', source: 'writer' }),
        authorships: db.hasMany({ inverse: 'novel' }),
      });
      var Authorship = db.model('authorship');

      Author.relations.should.have.keys('books', 'authorships');
      Book.relations.should.have.keys('authors', 'authorships');
      Authorship.relations.should.have.keys('writer', 'novel');
    });

    it('generates implicit relations w/ source specified', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship', source: 'novel' }),
      });
      var Book = db.model('book', {
        authors: db.hasMany({ through: 'authorships', source: 'writer' }),
      });
      var Authorship = db.model('authorship');

      Author.relations.should.have.keys('books', 'authorships');
      Book.relations.should.have.keys('authors', 'authorships');
      Authorship.relations.should.have.keys('writer', 'novel');
    });

    it('works for example models `social`', function() {
      var Individual = db.model('individual');
      var Relationship = db.model('relationship');

      Individual.followersRelation.should.have.properties({
        inverse: 'following',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'followedId',
        foreignKeyAttr: 'followed_id',
      });

      Individual.followingRelation.should.have.properties({
        inverse: 'followers',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'followerId',
        foreignKeyAttr: 'follower_id',
      });

      Individual.activeRelationshipsRelation.should.have.properties({
        inverse: 'follower',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'followerId',
        foreignKeyAttr: 'follower_id',
      });

      Individual.passiveRelationshipsRelation.should.have.properties({
        inverse: 'followed',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'followedId',
        foreignKeyAttr: 'followed_id',
      });

      Relationship.followerRelation.should.have.properties({
        inverse: 'activeRelationships',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'followerId',
        foreignKeyAttr: 'follower_id',
      });

      Relationship.followedRelation.should.have.properties({
        inverse: 'passiveRelationships',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'followedId',
        foreignKeyAttr: 'followed_id',
      });

    });

  });

  describe('many-through', function() {

    it('has default values', function() {
      var Author = db.model('author', {
        reviews: db.hasMany({ through: 'books' }),
      });
      var Book = db.model('book', {
        reviews: db.hasMany('reviews')
      });
      var Review = db.model('review');

      Author.relations.should.have.keys('reviews');
      Author.reviewsRelation.relatedModelClass.should.equal(Review);
      Author.reviewsRelation.should.have.properties({
        inverse: undefined,
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });

      Book.relations.should.have.keys('reviews');
      Book.reviewsRelation.relatedModelClass.should.equal(Review);
      Book.reviewsRelation.should.have.properties({
        inverse: 'book',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'bookId',
        foreignKeyAttr: 'book_id',
      });

      Review.relations.should.have.keys('book');
    });

    it('finds source relation by matching on name', function() {
      var Author = db.model('author', {
        critiques: db.hasMany('reviews', { through: 'books' }),
      });
      var Book = db.model('book', {
        critiques: db.hasMany('reviews')
      });
      var Review = db.model('review');

      Author.relations.should.have.keys('critiques');
      Author.critiquesRelation.relatedModelClass.should.equal(Review);
      Author.critiquesRelation.should.have.properties({
        inverse: undefined,
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });

      Book.relations.should.have.keys('critiques');
      Book.critiquesRelation.relatedModelClass.should.equal(Review);
      Book.critiquesRelation.should.have.properties({
        inverse: 'book',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'bookId',
        foreignKeyAttr: 'book_id',
      });

      Review.relations.should.have.keys('book');
    });

    it('fetches through many w/ multiple custom sources', function() {
      var Publisher = db.model('publisher', {
        critiques: db.hasMany('reviews', { through: 'authors', source: 'reviews' }),
      });
      var Author = db.model('author', {
        reviews: db.hasMany({ through: 'books', source: 'critiques' }),
      });
      var Book = db.model('book', {
        critiques: db.hasMany('reviews')
      });
      var Review = db.model('review', {
        book: db.belongsTo('book', { inverse: 'critiques' }),
      });

      Publisher.relations.should.have.keys('critiques');
      Publisher.critiquesRelation.relatedModelClass.should.equal(Review);
      Publisher.critiquesRelation.should.have.properties({
        inverse: undefined,
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'publisherId',
        foreignKeyAttr: 'publisher_id',
      });

      Author.relations.should.have.keys('reviews');
      Author.reviewsRelation.relatedModelClass.should.equal(Review);
      Author.reviewsRelation.should.have.properties({
        inverse: undefined,
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });

      Book.relations.should.have.keys('critiques');
      Book.critiquesRelation.relatedModelClass.should.equal(Review);
      Book.critiquesRelation.should.have.properties({
        inverse: 'book',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'bookId',
        foreignKeyAttr: 'book_id',
      });

      Review.relations.should.have.keys('book');
    });

    it('works through a belongsTo', function() {
      var Author = db.model('author', {
        reviews: db.hasMany({ through: 'books' }),
        reviewers: db.hasMany({ through: 'reviews' }),
      });
      var Book = db.model('book', {
        reviews: db.hasMany(),
        reviewers: db.hasMany({ through: 'reviews', source: 'critic' }),
      });
      var Review = db.model('review', { critic: db.belongsTo('reviewer') });
      var Reviewer = db.model('reviewer');

      Author.relations.should.have.keys('reviews', 'reviewers');
      Author.reviewersRelation.relatedModelClass.should.equal(Reviewer);
      Author.reviewersRelation.should.have.properties({
        inverse: undefined,
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'authorId',
        foreignKeyAttr: 'author_id',
      });

      Book.relations.should.have.keys('reviews', 'reviewers');
      Book.reviewersRelation.relatedModelClass.should.equal(Reviewer);
      Book.reviewersRelation.should.have.properties({
        inverse: undefined,
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: 'bookId',
        foreignKeyAttr: 'book_id',
      });

      Review.relations.should.have.keys('book', 'critic');
      Reviewer.relations.should.have.keys('reviews');
    });

    it('throws an error when it cannot find the source relation', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship' }),
        reviewers: db.hasMany({ through: 'books', source: 'critic' }),
      });
      expect(function() {
        Author.reviewersRelation;
      }).to.throw(/could not find.*authorship#critic.*authorship#critics.*via.*author#books.*for.*author#reviewers/i);
    });

    it('throws an error when it cannot find source relation on non-primary through', function() {
      var Publisher = db.model('publisher', {
        critiques: db.hasMany('reviews', { through: 'authors', source: 'reviews' }),
      });
      db.model('author', {
        reviews: db.hasMany({ through: 'books', source: 'critiques' }),
      });
      db.model('book', { reviews: db.hasMany() });

      expect(function() {
        Publisher.critiquesRelation;
      }).to.throw(/could not find.*book#critiques.*book#critique.*via.*author#reviews.*for.*publisher#critiques/i);
    });

  });

}));
