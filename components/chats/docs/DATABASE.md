# Database Schema Documentation

Database schema for the Chats component using MasterController ORM.

## Tables

### `chat`
Stores chat sessions.

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (auto-increment) |
| `session_id` | STRING | Unique session identifier |
| `title` | STRING | Chat title |
| `created_by` | INTEGER | Creator type: 1=API, 2=Admin, 3=User, 4=Workspace |
| `total_token_count` | INTEGER | Total tokens used in chat (default: 0) |
| `created_at` | STRING | Creation timestamp (ms) |
| `updated_at` | STRING | Last update timestamp (ms) |
| `is_archived` | BOOLEAN | Archived flag (default: false) |
| `archived_at` | STRING | Archive timestamp (ms) |
| `is_deleted` | BOOLEAN | Soft delete flag (default: false) |
| `deleted_at` | STRING | Delete timestamp (ms) |
| `disable_chat_creation` | BOOLEAN | Disable creation flag (default: false) |

**Relationships:**
- `hasMany` → `messages`
- `hasMany` → `UserChat` (many-to-many through join table)

**Indexes:**
- Primary: `id`
- Unique: `session_id`
- Index: `is_archived`, `is_deleted`, `updated_at`

---

### `messages`
Stores user and AI messages.

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (auto-increment) |
| `chat_id` | INTEGER | Foreign key to `chat.id` |
| `user_id` | STRING | User ID (nullable) |
| `role` | INTEGER | Message role: 1=Assistant, 2=User, 3=System |
| `content` | STRING | Message content (required) |
| `model_id` | INTEGER | Model ID used |
| `token_count` | INTEGER | Token count |
| `max_tokens` | INTEGER | Max tokens setting (default: 800) |
| `tokens_per_seconds` | INTEGER | TPS metric (default: 0) |
| `generation_time_ms` | INTEGER | Generation time in ms (nullable) |
| `start_time` | STRING | Generation start time (nullable) |
| `end_time` | STRING | Generation end time (nullable) |
| `is_edited` | BOOLEAN | Edit flag (default: false) |
| `original_content` | STRING | Original content before edit (nullable) |
| `is_deleted` | BOOLEAN | Soft delete flag (default: false) |
| `deleted_at` | STRING | Delete timestamp (ms) |
| `meta` | STRING | JSON metadata (nullable) |
| `created_at` | STRING | Creation timestamp (ms) |
| `updated_at` | STRING | Last update timestamp (ms) |

**Relationships:**
- `belongsTo` → `Chat` (via `chat_id`)
- `hasMany` → `thinking`

**Indexes:**
- Primary: `id`
- Foreign: `chat_id`
- Index: `role`, `created_at`, `is_deleted`

**Meta JSON Structure:**
```json
{
  "model": "gpt-4",
  "modelId": "1",
  "temperature": 0.7,
  "systemPrompt": "...",
  "attachments": []
}
```

---

### `userchat`
Many-to-many join table for users and chats.

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (auto-increment) |
| `user_id` | STRING | User ID |
| `chat_id` | INTEGER | Foreign key to `chat.id` |
| `created_at` | STRING | Membership creation timestamp |
| `updated_at` | STRING | Last update timestamp |

**Relationships:**
- Links `users` ↔ `chat` (many-to-many)

**Indexes:**
- Primary: `id`
- Composite: `(user_id, chat_id)` UNIQUE
- Index: `updated_at`

---

### `thinking`
Stores extended thinking sections from AI responses.

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (auto-increment) |
| `messages_id` | INTEGER | Foreign key to `messages.id` |
| `section_id` | STRING | Unique section identifier (e.g., "think_001") |
| `content` | STRING | Thinking content |
| `start_time` | INTEGER | Start timestamp (ms) |
| `end_time` | INTEGER | End timestamp (ms) |
| `thinking_tokens_used` | INTEGER | Tokens used for thinking |
| `created_at` | STRING | Creation timestamp (ms) |

**Relationships:**
- `belongsTo` → `messages` (via `messages_id`)

**Indexes:**
- Primary: `id`
- Foreign: `messages_id`
- Index: `section_id`, `end_time`

---

### `chatcontext`
Stores chat context snapshots (for workspace overrides).

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (auto-increment) |
| `chat_id` | INTEGER | Foreign key to `chat.id` |
| `context_data` | STRING | JSON context data |
| `created_at` | STRING | Creation timestamp (ms) |

**Context Data JSON Structure:**
```json
{
  "systemPrompt": "Custom system prompt...",
  "temperature": 0.8,
  "maxTokens": 2000,
  "model": "gpt-4"
}
```

---

## Relationships Diagram

```
users (external)
  ↓
userchat (join table)
  ↓
chat
  ├─→ messages
  │    ├─→ thinking (one-to-many)
  │    └─→ media_message_links (external, via Media component)
  └─→ chatcontext (optional workspace overrides)
```

---

## Queries

### Common Queries

#### Get all chats for a user
```javascript
const memberships = chatContext.UserChat
  .where(uc => uc.user_id == $$, userId)
  .orderByDescending(uc => uc.updated_at)
  .toList();

const chats = [];
for (const m of memberships) {
  const chat = chatContext.Chat
    .where(c => c.id == $$ && c.is_archived == $$ && c.is_deleted == $$,
           m.chat_id, 0, 0)
    .single();
  if (chat) chats.push(chat);
}
```

#### Get chat with messages
```javascript
const chat = chatContext.Chat
  .where(c => c.id == $$, chatId)
  .single();

// Messages are eager-loaded via ORM relationship
const messages = chat.Messages;
```

#### Get thinking sections for a message
```javascript
const thinkingSections = chatContext.Thinking
  .where(t => t.messages_id == $$, messageId)
  .orderBy(t => t.end_time)
  .toList();
```

---

## Migrations

Migrations are stored in: `app/models/db/migrations/`

### Initial Migration
`1759205294156_Init_migration.js` - Creates all tables with proper schema.

### Running Migrations
```bash
# Run all pending migrations
masterrecord update-database chatContext

# Rollback last migration
masterrecord rollback-database chatContext
```

---

## Database Files

- **Development**: `db/development.sqlite3`
- **Production**: Configure via environment variables

---

## Performance Optimization

### Indexing Strategy
- Index foreign keys (`chat_id`, `messages_id`, `user_id`)
- Index frequently queried columns (`updated_at`, `is_deleted`, `is_archived`)
- Composite index on `(user_id, chat_id)` for membership lookups

### Query Optimization
- Use eager loading for relationships (avoid N+1 queries)
- Limit result sets with pagination
- Use soft deletes to avoid data loss

### Caching Strategy
- Cache recent chats per user (Redis recommended)
- Cache user memberships
- Invalidate on create/update/delete

---

## Data Retention

- Soft deletes: Keep for 30 days before hard delete
- Archived chats: Keep indefinitely unless user deletes
- Thinking sections: Keep permanently (useful for analytics)

---

## Backup & Recovery

Recommended backup strategy:
- Daily full backup
- Hourly incremental backup
- Retention: 30 days

```bash
# SQLite backup example
sqlite3 db/development.sqlite3 ".backup db/backup_$(date +%Y%m%d).sqlite3"
```

---

## Security

- Sanitize all input before storage (prevent SQL injection)
- Use ORM parameterized queries (protects against injection)
- Encrypt sensitive data at rest (not currently implemented)
- Audit log all destructive operations

---

## Future Enhancements

- Full-text search index on `messages.content`
- Partitioning for large tables (chat history)
- Read replicas for analytics queries
- Time-series optimization for token analytics
