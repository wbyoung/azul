'use strict';

require('../helpers');

describe('relation configuration', __db(function() {
  /* global db */

  var attr, hasMany, belongTo;

  beforeEach(require('../common').models);
  beforeEach(function() {
    attr = db.attr;
    hasMany = db.hasMany;
    belongTo = db.belongTo;
  });

  describe('belong-to only', function() {
    it('is waiting to be written');
  });

  describe('has-many only', function() {

    it('allows customization of foreign key', function() {
      var Book = db.model('book', { authorKey: attr('author_num'), });
      var Writer = db.model('writer', {
        books: hasMany(Book, { foreignKey: 'authorKey' }),
      });
      var keys = {
        foreignKey: 'authorKey',
        foreignKeyAttr: 'author_num',
      };
      Writer.booksRelation.should.have.properties(keys);
      Book.writerRelation.should.have.properties(keys); // implicit inverse
    });

  });

  describe('one-to-one', function() {
    it('is waiting to be written');
  });

  describe('one-to-many', function() {
    it('is waiting to be written');
  });

  describe('many-to-many', function() {

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

    it('works for the simplest configuration', function() {
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
