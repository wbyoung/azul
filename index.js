'use strict';

// REVISIT: distinct
// REVISIT: express transaction middleware (every request wrapped in a transaction)

// REVISIT: testing helpers. here are some things to consider that are nice to have
// during app development:
//   - handle insert of objects with specific IDs
//   - handle reseting sequence ids for testing
//   - handle stubbing timestamp based fields during testing allowing easier
//     assertions to be made. for instance, a model that has a field that is
//     configured to be set to the current time during update (or insert)
//     should be able to stub that.

// REVISIT: cli features that would be nice:
//   - azul migrate --all (which would migrate all databases that could be
//     connected to. for instance, development & test)

// REVISIT: validations (before/after save, before/after update, before/after destroy)
// REVISIT: polymorphic
// REVISIT: inherited
// REVISIT: aggregation
// REVISIT: events/hooks for logging
// REVISIT: raw that returns real model objects & raw that returns just js objects
// REVISIT: all association types & through associations + convenience methods for associations
// REVISIT: feature like scope in rails or just use django manager style

// REVISIT: consider more active record approach than django approach where there are no managers, and
// Post.objects.... becomes Post.all() or Post.where....
// REVISIT: consider Post.objects.first()
// REVISIT: consider helper methods like Post.objects.find_by_title() returning just one (exception for 0 or many) by title
// REVISIT: events/hooks for lifecycle and/or validation
