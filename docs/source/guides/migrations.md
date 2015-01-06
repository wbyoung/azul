---
title: Migrations
toc: true
active: guides
template: page.html
---

# Migrations

## Creating Tables

Content coming soon&hellip;

### Field Types

#### `auto`

#### `increments`

#### `serial`

#### `integer`

#### `integer64`

#### `string`

#### `text`

#### `binary`

#### `bool`

#### `date`

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>date</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `time`

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>time</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `dateTime`

<div class="panel panel-info">
<div class="panel-heading"><span class="panel-title">SQLite3</span></div>
<div class="panel-body">
SQLite3 stores <code>dateTime</code> as a number &amp; Azul.js does not
currently support distinguishing this type in any way.
</div>
</div>

#### `float`

#### `decimal`
