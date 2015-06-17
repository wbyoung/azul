'use strict';

require('../helpers');

describe('Relation.inverse', __db(function() {
  /* global db */

  beforeEach(require('../common').models);

  describe('belong-to only', function() {

    it('calculates the inverse ', function() {
      var Room = db.model('room');
      var Floor = db.model('floor', { room: db.belongsTo() });

      // floor must be accessed first to trigger generation of inverse
      Floor.relations.should.have.keys('room');
      Floor.roomRelation.inverse.should.eql('floors');
      Floor.roomRelation.inverseRelation().should.equal(Room.floorsRelation);

      Room.relations.should.have.keys('floors');
      Room.floorsRelation.inverse.should.eql('room');
      Room.floorsRelation.inverseRelation().should.equal(Floor.roomRelation);
    });

  });

  describe('has-many only', function() {

    it('calculates the inverse ', function() {
      var Room = db.model('room', { floors: db.hasMany() });
      var Floor = db.model('floor');

      // room must be accessed first to trigger generation of inverse
      Room.relations.should.have.keys('floors');
      Room.floorsRelation.inverse.should.eql('room');
      Room.floorsRelation.inverseRelation().should.equal(Floor.roomRelation);

      Floor.relations.should.have.keys('room');
      Floor.roomRelation.inverse.should.eql('floors');
      Floor.roomRelation.inverseRelation().should.equal(Room.floorsRelation);
    });

  });

  describe('one-to-many', function() {

    it('calculates the inverse ', function() {
      var Room = db.model('room', { floors: db.hasMany() });
      var Floor = db.model('floor', { room: db.belongsTo() });

      Room.relations.should.have.keys('floors');
      Room.floorsRelation.inverse.should.eql('room');
      Room.floorsRelation.inverseRelation().should.equal(Floor.roomRelation);

      Floor.relations.should.have.keys('room');
      Floor.roomRelation.inverse.should.eql('floors');
      Floor.roomRelation.inverseRelation().should.equal(Room.floorsRelation);
    });

    it('calculates the inverse w/ hasMany defining inverse', function() {
      var Room = db.model('room', {
        floors: db.hasMany({ inverse: 'area' })
      });
      var Floor = db.model('floor', { area: db.belongsTo('room') });

      Room.relations.should.have.keys('floors');
      Room.floorsRelation.inverse.should.eql('area');
      Room.floorsRelation.inverseRelation().should.equal(Floor.areaRelation);

      Floor.relations.should.have.keys('area');
      Floor.areaRelation.inverse.should.eql('floors');
      Floor.areaRelation.inverseRelation().should.equal(Room.floorsRelation);
    });

    it('calculates the inverse w/ belongsTo defining inverse', function() {
      var Room = db.model('room', { floors: db.hasMany() });
      var Floor = db.model('floor', {
        area: db.belongsTo('room', { inverse: 'floors' })
      });

      Room.relations.should.have.keys('floors');
      Room.floorsRelation.inverse.should.eql('area');
      Room.floorsRelation.inverseRelation().should.equal(Floor.areaRelation);

      Floor.relations.should.have.keys('area');
      Floor.areaRelation.inverse.should.eql('floors');
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
      Author.booksRelation.inverse.should.eql('authors');
      Author.booksRelation.inverseRelation().should.to.equal(Book.authorsRelation);

      Book.relations.should.have.keys('authors', 'authorships');
      Book.authorsRelation.inverse.should.eql('books');
      Book.authorsRelation.inverseRelation().should.to.equal(Author.booksRelation);

      Authorship.relations.should.have.keys('book', 'author');
    });

    it('calculates the inverse when w/ all relations explicit', function() {
      var Author = db.model('author', {
        books: db.hasMany({ through: 'authorship' }),
        authorships: db.hasMany(),
      });
      var Book = db.model('book', {
        authors: db.hasMany({ through: 'authorship' }),
        authorships: db.hasMany(),
      });
      var Authorship = db.model('authorship', {
        book: db.belongsTo(),
        author: db.belongsTo(),
      });

      Author.relations.should.have.keys('books', 'authorships');
      Author.booksRelation.inverse.should.eql('authors');
      Author.booksRelation.inverseRelation().should.to.equal(Book.authorsRelation);

      Book.relations.should.have.keys('authors', 'authorships');
      Book.authorsRelation.inverse.should.eql('books');
      Book.authorsRelation.inverseRelation().should.to.equal(Author.booksRelation);

      Authorship.relations.should.have.keys('book', 'author');
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
      Author.booksRelation.inverse.should.eql('authors');
      Author.booksRelation.inverseRelation().should.to.equal(Book.authorsRelation);

      Book.relations.should.have.keys('authors', 'authorships');
      Book.authorsRelation.inverse.should.eql('books');
      Book.authorsRelation.inverseRelation().should.to.equal(Author.booksRelation);

      Authorship.relations.should.have.keys('book', 'author');
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
      Author.booksRelation.inverse.should.eql('writers');
      Author.booksRelation.inverseRelation().should.to.equal(Book.writersRelation);

      Book.relations.should.have.keys('writers', 'authorships');
      Book.writersRelation.inverse.should.eql('books');
      Book.writersRelation.inverseRelation().should.to.equal(Author.booksRelation);

      Authorship.relations.should.have.keys('book', 'author');
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
      Author.booksRelation.inverse.should.eql('writers');
      Author.booksRelation.inverseRelation().should.to.equal(Book.writersRelation);

      Book.relations.should.have.keys('writers', 'authorships');
      Book.writersRelation.inverse.should.eql('books');
      Book.writersRelation.inverseRelation().should.to.equal(Author.booksRelation);

      Authorship.relations.should.have.keys('book', 'author');
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
      Author.booksRelation.inverse.should.eql('authors');
      Author.authorshipsRelation.inverse.should.eql('writer');
      Author.booksRelation.inverseRelation().should.equal(Book.authorsRelation);
      Author.authorshipsRelation.inverseRelation().should.equal(Authorship.writerRelation);

      Book.relations.should.have.keys('authors', 'authorships');
      Book.authorsRelation.inverse.should.eql('books');
      Book.authorshipsRelation.inverse.should.eql('novel');
      Book.authorsRelation.inverseRelation().should.equal(Author.booksRelation);
      Book.authorshipsRelation.inverseRelation().should.equal(Authorship.novelRelation);

      Authorship.relations.should.have.keys('writer', 'novel');
      Authorship.writerRelation.inverse.should.eql('authorships');
      Authorship.novelRelation.inverse.should.eql('authorships');
      Authorship.writerRelation.inverseRelation().should.equal(Author.authorshipsRelation);
      Authorship.novelRelation.inverseRelation().should.equal(Book.authorshipsRelation);
    });

    it('works for example models `social`', function() {
      var Individual = db.model('individual');
      var Relationship = db.model('relationship');

      Individual.relations.should.have.keys([
        'followers', 'following',
        'activeRelationships',
        'passiveRelationships',
      ]);
      Individual.followersRelation.inverseRelation()._name
        .should.equal(Individual.followingRelation._name);
      Individual.followingRelation.inverseRelation()
        .should.equal(Individual.followersRelation);
      Individual.activeRelationshipsRelation.inverseRelation()
        .should.equal(Relationship.followerRelation);
      Individual.passiveRelationshipsRelation.inverseRelation()
        .should.equal(Relationship.followedRelation);

      Relationship.relations.should.have.keys([
        'follower', 'followed',
      ]);
      Relationship.followerRelation.inverseRelation()
        .should.equal(Individual.activeRelationshipsRelation);
      Relationship.followedRelation.inverseRelation()
        .should.equal(Individual.passiveRelationshipsRelation);
    });

    // TODO: come back to this. the test passes, but the configuration is not
    // actually working to query for data. see self_join_tets.js.
    it('works with self-references', function() {
      // the friendships and enmities relations must end up being part of the
      // animal relationship in order for no ambiguities to exist. if not, the
      // has-many-through will create the following:
      //   - Friendship.belongsTo(friend:Animal)
      //   - Enmity.belongsTo(enemy:Animal)
      // triggering the addition of:
      //   - Animal.hasMany(friendships, inverse:friend)
      //   - Animal.hasMany(enmities, inverse:enemy)
      // these relationships are not correct. they should be hasMany w/
      //   - Animal.hasMany(friendships, inverse:animal)
      //   - Animal.hasMany(enmities, inverse:animal)
      // this test adds them by specifying the base belongsTo on each join.
      var Animal = db.model('animal', {
        name: db.attr(),
        friends: db.hasMany('animal', { join: 'friendships' }),
        enemies: db.hasMany('animal', { join: 'enmities' }),
      });
      var Friendship = db.model('friendship', { animal: db.belongsTo() });
      var Enmity = db.model('enmity', { animal: db.belongsTo() });

      Animal.relations.should.have.keys([
        'friends', 'friendships', 'enemies', 'enmities'
      ]);
      Friendship.relations.should.have.keys('animal', 'friend');
      Enmity.relations.should.have.keys('animal', 'enemy');
    });

    it('works with self-references that use intermediate relation', function() {
      // see note above. this defines friendships & enmities to meet minimum
      // requirements for setting up the relationship in a non-ambiguous way.
      var Animal = db.model('animal', {
        name: db.attr(),
        friends: db.hasMany('animal', { join: 'friendships' }),
        enemies: db.hasMany('animal', { join: 'enmities' }),
        friendships: db.hasMany(),
        enmities: db.hasMany(),
      });
      var Friendship = db.model('friendship');
      var Enmity = db.model('enmity');

      Animal.relations.should.have.keys([
        'friends', 'friendships', 'enemies', 'enmities'
      ]);
      Friendship.relations.should.have.keys('animal', 'friend');
      Enmity.relations.should.have.keys('animal', 'enemy');
    });

    it('works with self-references that use inverse on belongs-to', function() {
      // see note above. this defines the inverse on the belongsTo relations
      // to ensure relationship is set up in a non-ambiguous way.
      var Animal = db.model('animal', {
        name: db.attr(),
        friends: db.hasMany('animal', { join: 'friendships' }),
        enemies: db.hasMany('animal', { join: 'enmities' }),
      });
      var Friendship = db.model('friendship', {
        friend: db.belongsTo('animal', { inverse: 'passiveFriendships' })
      });
      var Enmity = db.model('enmity', {
        enemy: db.belongsTo('animal', { inverse: 'passiveEnmities' })
      });

      Animal.relations.should.have.keys([
        'friends', 'passiveFriendships', 'enemies', 'passiveEnmities'
      ]);
      Friendship.relations.should.have.keys('friend');
      Enmity.relations.should.have.keys('enemy');
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

      expect(Author.reviewsRelation.inverseRelation()).to.not.exist;
    });

    it('does not have an inverse when has-many is included', function() {
      var Author = db.model('author', {
        reviews: db.hasMany({ through: 'books' }),
        books: db.hasMany(),
      });
      var Book = db.model('book', { reviews: db.hasMany() });
      var Review = db.model('review');

      Author.relations.should.have.keys('reviews', 'books');
      Book.relations.should.have.keys('reviews', 'author');
      Review.relations.should.have.keys('book');

      expect(Author.reviewsRelation.inverseRelation()).to.not.exist;
    });

  });

}));
