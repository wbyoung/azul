'use strict';

require('../helpers');

var _ = require('lodash');

describe('Relation.inverse', __db(function() {
  /* global db */

  beforeEach(require('../common').models);

  var inverse = function(model, attr) {
    return _.result(model[attr + 'Relation'], 'inverseRelation');
  };

  describe('belong-to only', function() {
    it('is waiting to be written');
  });

  describe('has-many only', function() {
    it('is waiting to be written');
  });

  describe('one-to-many', function() {

    it('calculates the inverse ', function() {
      var Room = db.model('room', { floors: db.hasMany() });
      var Floor = db.model('floor', { room: db.belongsTo() });
      Room.relations.should.have.keys('floors');
      Floor.relations.should.have.keys('room');
      Room.floorsRelation.inverse.should.eql('room');
      Floor.roomRelation.inverse.should.eql('floors');
      Room.floorsRelation.inverseRelation().should.equal(Floor.roomRelation);
      Floor.roomRelation.inverseRelation().should.equal(Room.floorsRelation);
    });

    it('calculates the inverse w/ hasMany defining inverse', function() {
      var Room = db.model('room', {
        floors: db.hasMany({ inverse: 'area' })
      });
      var Floor = db.model('floor', { area: db.belongsTo('room') });
      Room.relations.should.have.keys('floors');
      Floor.relations.should.have.keys('area');
      Room.floorsRelation.inverse.should.eql('area');
      Floor.areaRelation.inverse.should.eql('floors');
      Room.floorsRelation.inverseRelation().should.equal(Floor.areaRelation);
      Floor.areaRelation.inverseRelation().should.equal(Room.floorsRelation);
    });

    it('calculates the inverse w/ belongsTo defining inverse', function() {
      var Room = db.model('room', { floors: db.hasMany() });
      var Floor = db.model('floor', {
        area: db.belongsTo('room', { inverse: 'floors' })
      });
      Room.relations.should.have.keys('floors');
      Floor.relations.should.have.keys('area');
      Room.floorsRelation.inverse.should.eql('area');
      Floor.areaRelation.inverse.should.eql('floors');
      Room.floorsRelation.inverseRelation().should.equal(Floor.areaRelation);
      Floor.areaRelation.inverseRelation().should.equal(Room.floorsRelation);
    });

  });

  describe('many-to-many', function() {

    it('calculates the inverse', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship' }),
      });
      var Book = db.model('book', {
        authors: db.hasMany({ through: 'authorship' }),
      });
      var Authorship = db.model('authorship', {
        book: db.belongsTo(),
        author: db.belongsTo(),
      });
      Author.relations.should.have.keys('books', 'authorships');
      Book.relations.should.have.keys('authors', 'authorships');
      Authorship.relations.should.have.keys('book', 'author');

      Book.authorsRelation.inverse.should.eql('books');
      Author.booksRelation.inverse.should.eql('authors');
      inverse(Author, 'books').should.to.equal(Book.authorsRelation);
      inverse(Book, 'authors').should.to.equal(Author.booksRelation);
    });

    it('calculates the inverse w/ implicit join model', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship' }),
      });
      var Book = db.model('book', {
        authors: db.hasMany({ through: 'authorship' }),
      });
      var Authorship = db.model('authorship');
      Author.relations.should.have.keys('books', 'authorships');
      Book.relations.should.have.keys('authors', 'authorships');
      Authorship.relations.should.have.keys('book', 'author');

      Book.authorsRelation.inverse.should.eql('books');
      Author.booksRelation.inverse.should.eql('authors');
      inverse(Author, 'books').should.to.equal(Book.authorsRelation);
      inverse(Book, 'authors').should.to.equal(Author.booksRelation);
    });

    it('calculates the inverse w/ simple side defining inverse', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship', inverse: 'writers' }),
      });
      var Book = db.model('book', {
        writers: db.hasMany('author', {
          through: 'authorship',
          source: 'author',
        }),
      });
      var Authorship = db.model('authorship', {
        book: db.belongsTo(),
        author: db.belongsTo(),
      });
      Author.relations.should.have.keys('books', 'authorships');
      Book.relations.should.have.keys('writers', 'authorships');
      Authorship.relations.should.have.keys('book', 'author');

      Book.writersRelation.inverse.should.eql('books');
      Author.booksRelation.inverse.should.eql('writers');
      inverse(Author, 'books').should.to.equal(Book.writersRelation);
      inverse(Book, 'writers').should.to.equal(Author.booksRelation);
    });

    it('calculates the inverse w/ complex side defining inverse', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship' }),
      });
      var Book = db.model('book', {
        writers: db.hasMany('author', {
          through: 'authorship',
          source: 'author',
          inverse: 'books'
        }),
      });
      var Authorship = db.model('authorship', {
        book: db.belongsTo(),
        author: db.belongsTo(),
      });
      Author.relations.should.have.keys('books', 'authorships');
      Book.relations.should.have.keys('writers', 'authorships');
      Authorship.relations.should.have.keys('book', 'author');

      Book.writersRelation.inverse.should.eql('books');
      Author.booksRelation.inverse.should.eql('writers');
      inverse(Author, 'books').should.to.equal(Book.writersRelation);
      inverse(Book, 'writers').should.to.equal(Author.booksRelation);
    });

    it('works for example models `social`', function() {
      var Individual = db.model('individual');
      var Relationship = db.model('relationship');

      Relationship.relations.should.have.keys([
        'follower', 'followed',
      ]);

      Individual.relations.should.have.keys([
        'followers', 'following',
        'activeRelationships',
        'passiveRelationships',
      ]);

      inverse(Individual, 'followers')._name
        .should.equal(Individual.followingRelation._name);
      inverse(Individual, 'following')
        .should.equal(Individual.followersRelation);
      inverse(Individual, 'activeRelationships')
        .should.equal(Relationship.followerRelation);
      inverse(Individual, 'passiveRelationships')
        .should.equal(Relationship.followedRelation);
      inverse(Relationship, 'follower')
        .should.equal(Individual.activeRelationshipsRelation);
      inverse(Relationship, 'followed')
        .should.equal(Individual.passiveRelationshipsRelation);
    });

    it('works with self-references', function() {
      var Animal = db.model('animal', {
        name: db.attr(),
        friends: db.hasMany('animal', { join: 'friendships' }),
        enemies: db.hasMany('animal', { join: 'enmities' }),
      });
      var Friendship = db.model('friendship');
      var Enmity = db.model('enmity');

      Animal.relations.should.have.keys([
        'friends', 'friendships', 'enemies', 'enmities'
      ]);
      Friendship.relations.should.have.keys('animal', 'friend');
      Enmity.relations.should.have.keys('animal', 'enemy');
    });

  });

  describe('many-through', function() {

    it('does not have an inverse', function() {
      var Author = db.model('author', {
        reviews: db.hasMany({ through: 'books' }),
      });
      var Book = db.model('book', { reviews: db.hasMany() });
      var Review = db.model('review');

      Author.relations.should.have.keys('reviews');
      Book.relations.should.have.keys('reviews');
      Review.relations.should.have.keys('book');

      expect(inverse(Author, 'reviews')).to.not.exist;
    });

  });

}));
