# Database Schema Documentation

Database schema for the Media component using MasterRecord ORM.

## Table of Contents

- [Overview](#overview)
- [Database File](#database-file)
- [Tables](#tables)
  - [MediaFile](#mediafile)
  - [MediaSettings](#mediasettings)
- [Entity Models](#entity-models)
- [Migrations](#migrations)
- [Queries](#queries)
- [Relationships](#relationships)
- [Data Integrity](#data-integrity)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Media component uses two tables:
1. **MediaFile** - Tracks all uploaded files with metadata
2. **MediaSettings** - Stores media configuration (singleton pattern)

Both tables use MasterRecord ORM with SQLite as the database engine.

---

## Database File

- **Development:** `components/media/db/development.sqlite3`
- **Production:** Configured via environment variables
- **Context Name:** `mediaContext`

---

## Tables

### MediaFile

Tracks all uploaded files in the system.

**Table Name:** `media_file`

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique file identifier |
| `chat_id` | INTEGER | NOT NULL | Associated chat ID |
| `message_id` | INTEGER | NULLABLE | Associated message ID (null if unsent) |
| `filename` | STRING | NOT NULL | Original filename |
| `stored_filename` | STRING | NOT NULL | Unique stored filename |
| `file_path` | STRING | NOT NULL | Full path to file on disk |
| `mime_type` | STRING | NULLABLE | MIME type (e.g., `image/jpeg`) |
| `file_size` | INTEGER | NOT NULL, DEFAULT 0 | File size in bytes |
| `uploaded_by` | INTEGER | NULLABLE | User ID who uploaded the file |
| `upload_source` | STRING | DEFAULT 'admin' | Upload source (`admin`, `client`, `llm`, `api`) |
| `created_at` | STRING | NOT NULL | Creation timestamp (milliseconds) |
| `updated_at` | STRING | NOT NULL | Last update timestamp (milliseconds) |

**Indexes:**
- Primary: `id`
- Recommended: Index on `chat_id` for fast chat queries
- Recommended: Index on `message_id` for fast message queries
- Recommended: Composite index on `(chat_id, message_id)` for unsent image queries

**Default Values:**
```javascript
{
  file_size: 0,
  upload_source: 'admin',
  created_at: Date.now().toString(),
  updated_at: Date.now().toString()
}
```

---

### MediaSettings

Stores media storage configuration. **Only one record exists (singleton pattern).**

**Table Name:** `media_settings`

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier |
| `storage_limit_mb` | INTEGER | DEFAULT 1024 | Storage limit in megabytes |
| `storage_enabled` | BOOLEAN | DEFAULT true | Enable/disable storage limit enforcement |
| `created_at` | STRING | NOT NULL | Creation timestamp (milliseconds) |
| `updated_at` | STRING | NOT NULL | Last update timestamp (milliseconds) |

**Indexes:**
- Primary: `id`

**Default Values:**
```javascript
{
  storage_limit_mb: 1024, // 1 GB
  storage_enabled: true,
  created_at: Date.now().toString(),
  updated_at: Date.now().toString()
}
```

---

## Entity Models

### MediaFile Model

**File:** `app/models/MediaFile.js`

```javascript
class MediaFile {
  id(db) {
    db.integer().primary().auto();
  }

  chat_id(db) {
    db.integer().notNullable();
  }

  message_id(db) {
    db.integer().nullable();
  }

  filename(db) {
    db.string().notNullable();
  }

  stored_filename(db) {
    db.string().notNullable();
  }

  file_path(db) {
    db.string().notNullable();
  }

  mime_type(db) {
    db.string().nullable();
  }

  file_size(db) {
    db.integer().notNullable().default(0);
  }

  uploaded_by(db) {
    db.integer().nullable();
  }

  upload_source(db) {
    db.string().default('admin');
  }

  created_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }

  updated_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }
}
```

### MediaSettings Model

**File:** `app/models/MediaSettings.js`

```javascript
class MediaSettings {
  id(db) {
    db.integer().primary().auto();
  }

  storage_limit_mb(db) {
    db.integer().default(1024);
  }

  storage_enabled(db) {
    db.boolean().default(true);
  }

  created_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }

  updated_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }
}
```

### MediaContext

**File:** `app/models/mediaContext.js`

```javascript
var masterrecord = require('masterrecord');
const MediaFile = require("./MediaFile");
const MediaSettings = require("./MediaSettings");

class mediaContext extends masterrecord.context {
  constructor() {
    super();
    this.env("config/environments");
    this.dbset(MediaFile);
    this.dbset(MediaSettings);
  }
}

module.exports = mediaContext;
```

---

## Migrations

### Initial Migration

**File:** `app/models/db/migrations/1760328447543_Init_migration.js`

```javascript
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema {
  constructor(context) {
    super(context);
  }

  up(table) {
    this.init(table);

    this.createTable(table.MediaFile);
    this.createTable(table.MediaSettings);

    // Seed default settings
    this.seed('MediaSettings', {
      storage_limit_mb: 1024,
      storage_enabled: 1,
      created_at: Date.now().toString(),
      updated_at: Date.now().toString()
    });
  }

  down(table) {
    this.init(table);

    this.droptable(table.MediaFile);
    this.droptable(table.MediaSettings);
  }
}

module.exports = Init;
```

### Running Migrations

```bash
# Run all pending migrations
masterrecord update-database mediaContext

# Rollback last migration
masterrecord rollback-database mediaContext

# Generate new migration
masterrecord generate-migration mediaContext AddIndexes
```

---

## Queries

### MediaFile Queries

#### Create File Record

```javascript
const MediaFile = require('./models/MediaFile');

const mediaFile = new MediaFile();
mediaFile.chat_id = 123;
mediaFile.message_id = null; // Unsent
mediaFile.filename = 'photo.jpg';
mediaFile.stored_filename = '1731234567890-abc123.jpg';
mediaFile.file_path = '/path/to/storage/1731234567890-abc123.jpg';
mediaFile.mime_type = 'image/jpeg';
mediaFile.file_size = 512000;
mediaFile.uploaded_by = 1;
mediaFile.upload_source = 'client';
mediaFile.created_at = Date.now().toString();
mediaFile.updated_at = Date.now().toString();

mediaContext.MediaFile.add(mediaFile);
mediaContext.saveChanges();
```

#### Get File by ID

```javascript
const file = mediaContext.MediaFile
  .where(f => f.id == $$, fileId)
  .single();

if (file) {
  console.log('File:', file.filename);
} else {
  console.log('File not found');
}
```

#### Get Files by Chat ID

```javascript
const chatFiles = mediaContext.MediaFile
  .where(f => f.chat_id == $$, chatId)
  .toList();

console.log(`Found ${chatFiles.length} files for chat ${chatId}`);
```

#### Get Unsent Images for Chat

```javascript
// Images with chat_id but no message_id
const unsentImages = mediaContext.MediaFile
  .where(f => f.chat_id == $$ && f.message_id == null, chatId)
  .toList();

console.log(`Found ${unsentImages.length} unsent images`);
```

#### Get Files by Message ID

```javascript
const messageFiles = mediaContext.MediaFile
  .where(f => f.message_id == $$, messageId)
  .toList();

console.log(`Found ${messageFiles.length} files for message ${messageId}`);
```

#### Link Image to Message

```javascript
const image = mediaContext.MediaFile
  .where(f => f.id == $$, imageId)
  .single();

if (image) {
  image.message_id = messageId;
  image.updated_at = Date.now().toString();
  mediaContext.saveChanges();
}
```

#### List All Files (Paginated)

```javascript
const page = 1;
const limit = 50;
const offset = (page - 1) * limit;

const allFiles = mediaContext.MediaFile.toList();

// Sort by created_at descending
allFiles.sort((a, b) => {
  const aTime = parseInt(a.created_at || 0);
  const bTime = parseInt(b.created_at || 0);
  return bTime - aTime;
});

// Apply pagination
const files = allFiles.slice(offset, offset + limit);
const totalCount = allFiles.length;
const totalPages = Math.ceil(totalCount / limit);
```

#### Search Files by Filename

```javascript
const searchTerm = 'photo';
const allFiles = mediaContext.MediaFile.toList();

const filtered = allFiles.filter(f =>
  f.filename && f.filename.toLowerCase().includes(searchTerm.toLowerCase())
);

console.log(`Found ${filtered.length} files matching "${searchTerm}"`);
```

#### Delete File

```javascript
const file = mediaContext.MediaFile
  .where(f => f.id == $$, fileId)
  .single();

if (file) {
  mediaContext.MediaFile.remove(file);
  mediaContext.saveChanges();
}
```

#### Get Storage Statistics

```javascript
// Total file count
const totalFiles = mediaContext.MediaFile.count();

// Total size
const allFiles = mediaContext.MediaFile.toList();
const totalSize = allFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);

// By source
const adminFiles = mediaContext.MediaFile
  .where(f => f.upload_source === 'admin')
  .count();

const clientFiles = mediaContext.MediaFile
  .where(f => f.upload_source === 'client')
  .count();

const llmFiles = mediaContext.MediaFile
  .where(f => f.upload_source === 'llm')
  .count();
```

---

### MediaSettings Queries

#### Get Settings (Singleton)

```javascript
let settings = mediaContext.MediaSettings.single();

if (!settings) {
  // Create default settings
  const MediaSettings = require('./models/MediaSettings');
  settings = new MediaSettings();
  settings.storage_limit_mb = 1024;
  settings.storage_enabled = true;
  settings.created_at = Date.now().toString();
  settings.updated_at = Date.now().toString();

  mediaContext.MediaSettings.add(settings);
  mediaContext.saveChanges();
}

console.log('Storage limit:', settings.storage_limit_mb, 'MB');
console.log('Storage enabled:', settings.storage_enabled);
```

#### Update Settings

```javascript
let settings = mediaContext.MediaSettings.single();

if (!settings) {
  const MediaSettings = require('./models/MediaSettings');
  settings = new MediaSettings();
  mediaContext.MediaSettings.add(settings);
}

// Update values
settings.storage_limit_mb = 2048;
settings.storage_enabled = true;
settings.updated_at = Date.now().toString();

mediaContext.saveChanges();
```

---

## Relationships

### MediaFile Relationships

The `MediaFile` table has foreign key relationships to:

1. **Chat** (via `chat_id`)
   - References: `components/chats/app/models/chat.js`
   - Relationship: Many files to one chat
   - Query: Get all files for a chat

2. **Message** (via `message_id`)
   - References: `components/chats/app/models/message.js`
   - Relationship: Many files to one message
   - Query: Get all files for a message
   - Note: `message_id` is nullable (unsent images)

3. **User** (via `uploaded_by`)
   - References: `components/user/app/models/user.js`
   - Relationship: Many files to one user
   - Query: Get all files uploaded by a user

**Note:** These are logical relationships. MasterRecord ORM does not enforce foreign key constraints at the database level.

### Query Across Relationships

```javascript
// Get chat with its files
const chatId = 123;
const chat = chatContext.Chat
  .where(c => c.id == $$, chatId)
  .single();

const chatFiles = mediaContext.MediaFile
  .where(f => f.chat_id == $$, chatId)
  .toList();

console.log(`Chat "${chat.title}" has ${chatFiles.length} files`);
```

```javascript
// Get message with its images
const messageId = 789;
const message = chatContext.Message
  .where(m => m.id == $$, messageId)
  .single();

const messageImages = mediaContext.MediaFile
  .where(f => f.message_id == $$, messageId)
  .toList();

console.log(`Message ${messageId} has ${messageImages.length} images`);
```

---

## Data Integrity

### File Record Validation

```javascript
function validateMediaFile(file) {
  if (!file.chat_id) {
    throw new Error('chat_id is required');
  }

  if (!file.filename) {
    throw new Error('filename is required');
  }

  if (!file.stored_filename) {
    throw new Error('stored_filename is required');
  }

  if (!file.file_path) {
    throw new Error('file_path is required');
  }

  if (file.file_size < 0) {
    throw new Error('file_size must be non-negative');
  }

  const validSources = ['admin', 'client', 'llm', 'api'];
  if (file.upload_source && !validSources.includes(file.upload_source)) {
    throw new Error(`Invalid upload_source: ${file.upload_source}`);
  }

  return true;
}
```

### Orphaned File Detection

```javascript
// Find files with no corresponding physical file
const allFiles = mediaContext.MediaFile.toList();
const fs = require('fs');

const orphanedRecords = [];
for (const file of allFiles) {
  if (!fs.existsSync(file.file_path)) {
    orphanedRecords.push(file);
  }
}

console.log(`Found ${orphanedRecords.length} orphaned database records`);
```

### Orphaned Physical Files

```javascript
// Find physical files with no database record
const fs = require('fs');
const path = require('path');

const storageDir = 'bb-storage/media';
const physicalFiles = fs.readdirSync(storageDir);
const dbFiles = mediaContext.MediaFile.toList();

const dbFilenames = new Set(dbFiles.map(f => f.stored_filename));
const orphanedFiles = physicalFiles.filter(f => !dbFilenames.has(f));

console.log(`Found ${orphanedFiles.length} orphaned physical files`);
```

---

## Performance

### Indexing Strategy

**Recommended Indexes:**

```sql
-- Index on chat_id for fast chat queries
CREATE INDEX idx_media_file_chat_id ON media_file(chat_id);

-- Index on message_id for fast message queries
CREATE INDEX idx_media_file_message_id ON media_file(message_id);

-- Composite index for unsent images query
CREATE INDEX idx_media_file_chat_msg ON media_file(chat_id, message_id);

-- Index on upload_source for statistics queries
CREATE INDEX idx_media_file_source ON media_file(upload_source);
```

**Note:** MasterRecord ORM does not automatically create these indexes. Add them manually or via migration.

### Query Optimization

```javascript
// Slow: Load all files then filter
const allFiles = mediaContext.MediaFile.toList();
const chatFiles = allFiles.filter(f => f.chat_id === chatId);

// Fast: Filter at query time
const chatFiles = mediaContext.MediaFile
  .where(f => f.chat_id == $$, chatId)
  .toList();
```

### Pagination Best Practices

```javascript
// For large datasets, use limit/offset pattern
const limit = 50;
const offset = (page - 1) * limit;

// Get total count first
const totalCount = mediaContext.MediaFile.count();

// Then get page of results
const files = mediaContext.MediaFile.toList()
  .slice(offset, offset + limit);
```

---

## Troubleshooting

### File Size Mismatch

**Problem:** Database `file_size` doesn't match actual file size.

**Solution:**
```javascript
const fs = require('fs');

const file = mediaContext.MediaFile
  .where(f => f.id == $$, fileId)
  .single();

if (file && fs.existsSync(file.file_path)) {
  const stats = fs.statSync(file.file_path);
  const actualSize = stats.size;

  if (file.file_size !== actualSize) {
    console.log(`Size mismatch: DB=${file.file_size}, Disk=${actualSize}`);

    // Fix it
    file.file_size = actualSize;
    file.updated_at = Date.now().toString();
    mediaContext.saveChanges();
  }
}
```

### Multiple Settings Records

**Problem:** More than one MediaSettings record exists (violates singleton pattern).

**Solution:**
```javascript
const allSettings = mediaContext.MediaSettings.toList();

if (allSettings.length > 1) {
  console.warn(`Found ${allSettings.length} settings records, keeping first`);

  // Keep first, remove rest
  for (let i = 1; i < allSettings.length; i++) {
    mediaContext.MediaSettings.remove(allSettings[i]);
  }

  mediaContext.saveChanges();
}
```

### Unsent Images Not Appearing

**Problem:** Images uploaded but not showing as unsent.

**Check:**
```javascript
const chatId = 123;

// Check if images exist for this chat
const allChatImages = mediaContext.MediaFile
  .where(f => f.chat_id == $$, chatId)
  .toList();

console.log(`Total images for chat ${chatId}: ${allChatImages.length}`);

// Check specifically for unsent (message_id is null)
const unsentImages = allChatImages.filter(f => f.message_id === null);
console.log(`Unsent images: ${unsentImages.length}`);

// Debug each image
allChatImages.forEach(img => {
  console.log(`Image ${img.id}: message_id=${img.message_id}`);
});
```

### Database Locked

**Problem:** `database is locked` error.

**Causes:**
- Multiple processes accessing database
- Long-running transaction

**Solution:**
```javascript
// Use transactions properly
try {
  mediaContext.beginTransaction();

  // Your operations here
  const file = new MediaFile();
  // ...
  mediaContext.MediaFile.add(file);
  mediaContext.saveChanges();

  mediaContext.commit();
} catch (error) {
  mediaContext.rollback();
  throw error;
}
```

---

## Related Documentation

- **[README.md](./README.md)** - Component overview
- **[API.md](./API.md)** - API reference
- **[STORAGE.md](./STORAGE.md)** - Storage management
