# Tokens Plugin - Database Schema & Architecture

Comprehensive documentation of the Tokens Plugin database schema, models, and data relationships.

## Table of Contents

1. [Overview](#overview)
2. [Database Configuration](#database-configuration)
3. [Tables](#tables)
4. [Models](#models)
5. [Data Types](#data-types)
6. [Migrations](#migrations)
7. [Relationships](#relationships)
8. [Indexes & Performance](#indexes--performance)
9. [Example Queries](#example-queries)

## Overview

The Tokens Plugin uses **MasterRecord** ORM with SQLite as the default database. The schema consists of two primary tables:

1. **TokenUsage** - Detailed token consumption records
2. **TokenSettings** - Global token limit configuration

The database is isolated to the plugin and stored at:
```
/bb-plugins/tokens-plugin/db/development.sqlite3
```

## Database Configuration

**Configuration File:** `config/environments/development.json`

```json
{
  "tokensContext": {
    "connection": "/bb-plugins/tokens-plugin/db/development.sqlite3",
    "password": "",
    "username": "",
    "type": "sqlite"
  }
}
```

**Context Class:** `app/models/tokensContext.js`

```javascript
const masterrecord = require('masterrecord');
const path = require('path');
const TokenUsage = require('./tokenUsage');
const TokenSettings = require('./tokenSettings');

class tokensContext extends masterrecord.context {
    constructor() {
        super();
        const pluginEnvPath = path.join(__dirname, '../../config/environments');
        this.env(pluginEnvPath);
        
        // Register models
        this.dbset(TokenUsage);
        this.dbset(TokenSettings);
    }
}

module.exports = tokensContext;
```

The context is registered as a singleton in `config/initializers/config.js`:

```javascript
var master = require('mastercontroller');
var tokensContext = require(`${master.root}/bb-plugins/tokens-plugin/app/models/tokensContext`);
master.addSingleton("tokensContext", tokensContext);
```

## Tables

### TokenUsage Table

Stores detailed token usage metrics for each LLM request/response pair.

**Location:** `app/models/tokenUsage.js`

#### Schema Definition

```javascript
class TokenUsage {
    // Primary Key
    id(db) {
        db.integer().primary().auto();
    }

    // Association Fields
    chat_id(db) {
        db.integer().nullable();
    }

    message_id(db) {
        db.integer().nullable();
    }

    user_id(db) {
        db.integer().nullable();
    }

    model_id(db) {
        db.integer().nullable();
    }

    // Model Information
    model_name(db) {
        db.string().nullable();
    }

    provider(db) {
        db.string().nullable();
    }

    // Token Counts
    prompt_tokens(db) {
        db.integer().default(0);
    }

    completion_tokens(db) {
        db.integer().default(0);
    }

    total_tokens(db) {
        db.integer().default(0);
    }

    // Timing Metrics
    request_start_time(db) {
        db.integer().nullable(); // Unix timestamp (ms)
    }

    request_end_time(db) {
        db.integer().nullable(); // Unix timestamp (ms)
    }

    duration_ms(db) {
        db.integer().nullable(); // Total duration in milliseconds
    }

    tokens_per_second(db) {
        db.integer().nullable(); // Tokens generated per second
    }

    // Cost Tracking
    estimated_cost(db) {
        db.integer().nullable(); // Estimated cost in USD
    }

    // Request Metadata
    workspace_id(db) {
        db.integer().nullable();
    }

    session_id(db) {
        db.string().nullable();
    }

    request_metadata(db) {
        db.string().nullable(); // JSON string for additional data
    }

    // Timestamps
    created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }
}
```

#### Field Reference

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | INTEGER | No | AUTO | Primary key |
| `chat_id` | INTEGER | Yes | NULL | Associated chat session ID |
| `message_id` | INTEGER | Yes | NULL | Associated message ID |
| `user_id` | INTEGER | Yes | NULL | User who made the request |
| `model_id` | INTEGER | Yes | NULL | Model ID reference |
| `model_name` | STRING | Yes | NULL | Model name (e.g., "gpt-4") |
| `provider` | STRING | Yes | NULL | LLM provider (e.g., "openai") |
| `prompt_tokens` | INTEGER | No | 0 | Input/prompt tokens count |
| `completion_tokens` | INTEGER | No | 0 | Output/completion tokens count |
| `total_tokens` | INTEGER | No | 0 | Total tokens (prompt + completion) |
| `request_start_time` | INTEGER | Yes | NULL | Request start timestamp (ms) |
| `request_end_time` | INTEGER | Yes | NULL | Request end timestamp (ms) |
| `duration_ms` | INTEGER | Yes | NULL | Request duration in milliseconds |
| `tokens_per_second` | INTEGER | Yes | NULL | Throughput (tokens/sec) |
| `estimated_cost` | INTEGER | Yes | NULL | Estimated cost in USD (cents) |
| `workspace_id` | INTEGER | Yes | NULL | Workspace ID association |
| `session_id` | STRING | Yes | NULL | Session identifier |
| `request_metadata` | STRING | Yes | NULL | JSON metadata string |
| `created_at` | STRING | No | NOW | Record creation timestamp (ms) |

#### Example Record

```json
{
  "id": 12345,
  "chat_id": 567,
  "message_id": 890,
  "user_id": 1,
  "model_id": 1,
  "model_name": "gpt-4",
  "provider": "openai",
  "prompt_tokens": 250,
  "completion_tokens": 150,
  "total_tokens": 400,
  "request_start_time": 1704067200000,
  "request_end_time": 1704067201500,
  "duration_ms": 1500,
  "tokens_per_second": 266.67,
  "estimated_cost": 15,
  "workspace_id": 1,
  "session_id": "sess_abc123",
  "request_metadata": "{\"temperature\": 0.7, \"max_tokens\": 2000}",
  "created_at": "1704067201500"
}
```

---

### TokenSettings Table

Stores global configuration for token limits and policies.

**Location:** `app/models/tokenSettings.js`

#### Schema Definition

```javascript
class TokenSettings {
    // Primary Key
    id(db) {
        db.integer().primary().auto();
    }

    // Global Token Limits
    global_token_limit(db) {
        db.integer().nullable(); // Unlimited if null
    }

    global_limit_period(db) {
        db.string().default('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
    }

    global_limit_enabled(db) {
        db.integer().default(0); // 0 = disabled, 1 = enabled
    }

    // Per-User Token Limits
    per_user_token_limit(db) {
        db.integer().nullable();
    }

    per_user_limit_period(db) {
        db.string().default('monthly');
    }

    per_user_limit_enabled(db) {
        db.integer().default(0);
    }

    // Per-Chat Limits
    per_chat_token_limit(db) {
        db.integer().nullable();
    }

    per_chat_limit_enabled(db) {
        db.integer().default(0);
    }

    // Rate Limiting
    rate_limit_enabled(db) {
        db.integer().default(0);
    }

    rate_limit_requests(db) {
        db.integer().default(100);
    }

    rate_limit_window(db) {
        db.integer().default(60); // Seconds
    }

    // Notification Settings
    notify_on_limit_reached(db) {
        db.integer().default(1);
    }

    notify_threshold(db) {
        db.integer().default(90); // Percentage 1-100
    }

    // Cost Tracking
    track_costs(db) {
        db.integer().default(0);
    }

    currency(db) {
        db.string().default('USD');
    }

    // Timestamps
    created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }

    updated_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }
}
```

#### Field Reference

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | INTEGER | No | 1 | Primary key (always 1) |
| `global_token_limit` | INTEGER | Yes | NULL | Global token limit |
| `global_limit_period` | STRING | No | 'monthly' | Period: daily, weekly, monthly, yearly |
| `global_limit_enabled` | INTEGER | No | 0 | Enable/disable global limit |
| `per_user_token_limit` | INTEGER | Yes | NULL | Per-user token limit |
| `per_user_limit_period` | STRING | No | 'monthly' | Per-user limit period |
| `per_user_limit_enabled` | INTEGER | No | 0 | Enable/disable per-user limit |
| `per_chat_token_limit` | INTEGER | Yes | NULL | Per-chat token limit |
| `per_chat_limit_enabled` | INTEGER | No | 0 | Enable/disable per-chat limit |
| `rate_limit_enabled` | INTEGER | No | 0 | Enable/disable rate limiting |
| `rate_limit_requests` | INTEGER | No | 100 | Max requests in window |
| `rate_limit_window` | INTEGER | No | 60 | Rate limit window (seconds) |
| `notify_on_limit_reached` | INTEGER | No | 1 | Send notifications |
| `notify_threshold` | INTEGER | No | 90 | Notification threshold (%) |
| `track_costs` | INTEGER | No | 0 | Enable cost tracking |
| `currency` | STRING | No | 'USD' | Currency code |
| `created_at` | STRING | No | NOW | Creation timestamp (ms) |
| `updated_at` | STRING | No | NOW | Last update timestamp (ms) |

#### Default Record

On plugin activation, the migration seeds a default record:

```json
{
  "id": 1,
  "global_token_limit": null,
  "global_limit_period": "monthly",
  "global_limit_enabled": 0,
  "per_user_token_limit": null,
  "per_user_limit_period": "monthly",
  "per_user_limit_enabled": 0,
  "per_chat_token_limit": null,
  "per_chat_limit_enabled": 0,
  "rate_limit_enabled": 0,
  "rate_limit_requests": 100,
  "rate_limit_window": 60,
  "notify_on_limit_reached": 1,
  "notify_threshold": 90,
  "track_costs": 0,
  "currency": "USD",
  "created_at": "1704067200000",
  "updated_at": "1704067200000"
}
```

---

## Models

### TokenUsage Model

**File:** `app/models/tokenUsage.js`

Used for creating, reading, and updating token usage records.

**Usage:**

```javascript
const TokensContext = require('../models/tokensContext');
const tokensContext = new TokensContext();

// Create a record
const usage = new (require('../models/tokenUsage'))();
usage.user_id = 1;
usage.chat_id = 567;
usage.model_name = 'gpt-4';
usage.prompt_tokens = 250;
usage.completion_tokens = 150;
usage.total_tokens = 400;

await tokensContext.TokenUsage.add(usage);

// Query records
const records = await tokensContext.TokenUsage
    .where({ user_id: 1 })
    .orderBy('created_at', 'DESC')
    .limit(10)
    .toList();

// Sum tokens for a period
const total = await tokensContext.TokenUsage
    .where({ 
        user_id: 1,
        created_at: { $gte: periodStart }
    })
    .sum('total_tokens');
```

### TokenSettings Model

**File:** `app/models/tokenSettings.js`

Used for managing global token settings.

**Usage:**

```javascript
const TokensContext = require('../models/tokensContext');
const tokensContext = new TokensContext();

// Get settings (always single record)
const settings = await tokensContext.TokenSettings.where().single();

if (!settings) {
    // Create default settings
    const settings = new (require('../models/tokenSettings'))();
    settings.global_token_limit = 1000000;
    settings.global_limit_enabled = 1;
    await tokensContext.TokenSettings.add(settings);
} else {
    // Update settings
    settings.global_token_limit = 2000000;
    settings.updated_at = Date.now().toString();
    await tokensContext.TokenSettings.update(settings);
}
```

---

## Migrations

### Initial Migration

**File:** `app/models/db/migrations/1760328420572_Init_migration.js`

Timestamp: `1760328420572` (October 28, 2024)

Creates both tables and seeds default settings:

```javascript
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema {
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);

        // Create tables
        this.createTable(table.TokenUsage);
        this.createTable(table.TokenSettings);

        // Seed default settings
        this.seed('TokenSettings', {
            global_token_limit: null,
            global_limit_period: 'monthly',
            global_limit_enabled: 0,
            per_user_token_limit: null,
            per_user_limit_period: 'monthly',
            per_user_limit_enabled: 0,
            per_chat_token_limit: null,
            per_chat_limit_enabled: 0,
            rate_limit_enabled: 0,
            rate_limit_requests: 100,
            rate_limit_window: 60,
            notify_on_limit_reached: 1,
            notify_threshold: 90,
            track_costs: 0,
            currency: 'USD',
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });
    }

    down(table){
        this.init(table);
        this.droptable(table.TokenUsage);
        this.droptable(table.TokenSettings);
    }
}

module.exports = Init;
```

**Running Migrations:**

```bash
cd /path/to/bookbag-ce
masterrecord update-database tokens
```

---

## Relationships

### TokenUsage Associations

TokenUsage records are associated with but not foreign-key constrained to:

| Field | Associated Table | Notes |
|-------|-------------------|-------|
| `user_id` | Users | Links to user who made request |
| `chat_id` | Chats | Links to chat session |
| `message_id` | Messages | Links to specific message |
| `model_id` | Models | Links to LLM model |
| `workspace_id` | Workspaces | Links to workspace context |

These are stored as integers for flexibility and to avoid strict foreign key constraints that could fail if related records are deleted.

---

## Indexes & Performance

### Recommended Indexes (Not Automatically Created)

For production use, consider adding these indexes for query performance:

```sql
-- Speed up user queries
CREATE INDEX idx_token_usage_user_id ON TokenUsage(user_id);

-- Speed up time-range queries
CREATE INDEX idx_token_usage_created_at ON TokenUsage(created_at);

-- Speed up combined queries
CREATE INDEX idx_token_usage_user_created ON TokenUsage(user_id, created_at);

-- Speed up chat queries
CREATE INDEX idx_token_usage_chat_id ON TokenUsage(chat_id);

-- Speed up model queries
CREATE INDEX idx_token_usage_model_name ON TokenUsage(model_name);
```

### Query Optimization Tips

1. **Always filter by date range for large datasets**
   ```javascript
   const periodStart = getPeriodStartTime(period);
   const records = await tokensContext.TokenUsage
       .where({ created_at: { $gte: periodStart } })
       .toList();
   ```

2. **Use aggregation instead of fetching all records**
   ```javascript
   const total = await tokensContext.TokenUsage
       .where({ user_id: 1 })
       .sum('total_tokens');
   ```

3. **Implement pagination for large result sets**
   ```javascript
   const records = await tokensContext.TokenUsage
       .where()
       .limit(50)
       .skip(page * 50)
       .toList();
   ```

---

## Example Queries

### Get Total Tokens for User in Current Month

```javascript
const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

const total = await tokensContext.TokenUsage
    .where({
        user_id: 1,
        created_at: { $gte: monthStart.getTime() }
    })
    .sum('total_tokens');

console.log(`User 1 used ${total} tokens this month`);
```

### Get Average Duration by Model

```javascript
const records = await tokensContext.TokenUsage.where().toList();

const byModel = {};
records.forEach(record => {
    if (!byModel[record.model_name]) {
        byModel[record.model_name] = { durations: [] };
    }
    if (record.duration_ms) {
        byModel[record.model_name].durations.push(record.duration_ms);
    }
});

Object.entries(byModel).forEach(([model, data]) => {
    const avg = data.durations.reduce((a, b) => a + b, 0) / data.durations.length;
    console.log(`${model}: avg ${avg.toFixed(0)}ms`);
});
```

### Find Most Active Users

```javascript
const records = await tokensContext.TokenUsage.where().toList();

const userStats = {};
records.forEach(record => {
    if (!userStats[record.user_id]) {
        userStats[record.user_id] = { requests: 0, tokens: 0 };
    }
    userStats[record.user_id].requests++;
    userStats[record.user_id].tokens += record.total_tokens;
});

const sorted = Object.entries(userStats)
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .slice(0, 10);

sorted.forEach(([userId, stats]) => {
    console.log(`User ${userId}: ${stats.tokens} tokens in ${stats.requests} requests`);
});
```

### Get All Requests in a Date Range

```javascript
const startDate = new Date('2024-01-01').getTime();
const endDate = new Date('2024-01-31').getTime();

const records = await tokensContext.TokenUsage
    .where({
        created_at: {
            $gte: startDate,
            $lte: endDate
        }
    })
    .orderBy('created_at', 'DESC')
    .toList();

console.log(`Found ${records.length} requests in January 2024`);
```

### Calculate Total Cost by User

```javascript
const records = await tokensContext.TokenUsage.where().toList();

const costByUser = {};
records.forEach(record => {
    if (!costByUser[record.user_id]) {
        costByUser[record.user_id] = 0;
    }
    costByUser[record.user_id] += record.estimated_cost || 0;
});

Object.entries(costByUser).forEach(([userId, cost]) => {
    console.log(`User ${userId}: $${cost.toFixed(2)}`);
});
```

### Check if User Has Exceeded Monthly Limit

```javascript
const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const settings = await tokensContext.TokenSettings.where().single();

const userUsage = await tokensContext.TokenUsage
    .where({
        user_id: 1,
        created_at: { $gte: monthStart.getTime() }
    })
    .sum('total_tokens');

const limit = settings.per_user_token_limit;
const exceeded = userUsage >= limit;

console.log(`User 1: ${userUsage}/${limit} tokens (${exceeded ? 'EXCEEDED' : 'OK'})`);
```

---

## Data Integrity

### Constraints

- **TokenSettings** has only one record (id = 1)
- **TokenUsage** records are append-only (no deletion by normal operation)
- Created timestamps are automatically set and immutable
- Updated timestamps are set at save time

### Retention

By default, TokenUsage records are kept indefinitely. Consider implementing:

1. **Archival** - Move old records to archive table monthly
2. **Purging** - Delete records older than 1-2 years
3. **Aggregation** - Pre-aggregate data daily and delete detail records

---

## Backup & Recovery

### SQLite Backup

```bash
# Manual backup
cp /bb-plugins/tokens-plugin/db/development.sqlite3 backup_tokens_$(date +%s).sqlite3

# Automated backup (add to cron)
0 2 * * * cp /path/to/bb-plugins/tokens-plugin/db/development.sqlite3 /backups/tokens_$(date +\%s).sqlite3
```

### Recovery

```bash
# Restore from backup
cp /backups/tokens_1704067200.sqlite3 /bb-plugins/tokens-plugin/db/development.sqlite3

# Restart application
systemctl restart bookbag-server
```

