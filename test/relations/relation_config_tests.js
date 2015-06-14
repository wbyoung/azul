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

    it('works for example models `social`', function() {
      var Individual = db.model('individual');
      var Relationship = db.model('relationship');

      Individual.followersRelation.should.have.properties({
        inverse: 'following',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: undefined,
        foreignKeyAttr: undefined,
      });

      Individual.followingRelation.should.have.properties({
        inverse: 'followers',
        primaryKey: 'pk',
        primaryKeyAttr: 'id',
        foreignKey: undefined,
        foreignKeyAttr: undefined,
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
    it('is waiting to be written');
  });

}));
