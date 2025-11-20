# Workspace Component Database Documentation

Complete database schema reference for the Workspace component in Bookbag CE.

## Table of Contents

- [Overview](#overview)
- [Database Context](#database-context)
- [Tables](#tables)
  - [Workspace Table](#workspace-table)
  - [WorkspaceUser Table](#workspaceuser-table)
  - [WorkspaceModel Table](#workspacemodel-table)
  - [WorkspaceChat Table](#workspacechat-table)
- [Relationships](#relationships)
- [Common Queries](#common-queries)
- [Migrations](#migrations)
- [Best Practices](#best-practices)

---

## Overview

**Database Type:** SQLite3

**ORM:** MasterRecord

**Context Class:** `workspaceContext`

**Database File (Development):** `components/workspace/db/development.sqlite3`

The Workspace component uses 4 tables to manage multi-tenant workspace functionality:
- **Workspace** - Core workspace entity
- **WorkspaceUser** - User membership with roles
- **WorkspaceModel** - AI model assignments
- **WorkspaceChat** - Chat linkages

---

## Database Context

### workspaceContext Class

**File:** `/components/workspace/app/models/workspaceContext.js`

```javascript
const Context = require('@bookbag/masterrecord').context;

class workspaceContext extends Context {
  constructor(configPath) {
    super(configPath || 'components/workspace/config/environments');

    // Register all workspace tables
    this.Workspace = this.dbSet('Workspace');
    this.WorkspaceUser = this.dbSet('WorkspaceUser');
    this.WorkspaceModel = this.dbSet('WorkspaceModel');
    this.WorkspaceChat = this.dbSet('WorkspaceChat');
  }
}

module.exports = workspaceContext;
```

### Cross-Component Access

The workspace component has access to other component contexts:

```javascript
// Available in all controllers
constructor(req) {
  this._workspaceContext = req.workspaceContext;  // Workspace tables
  this._userContext = req.userContext;            // User tables
  this._chatContext = req.chatContext;            // Chat tables
  this._modelContext = req.modelContext;          // Model tables
}
```

---

## Tables

### Workspace Table

Core workspace entity containing workspace information.

**Table Name:** `Workspace`

**Model File:** `/components/workspace/app/models/workspace.js`

#### Schema

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Unique workspace ID |
| `name` | String | NOT NULL | Workspace name |
| `description` | String | | Workspace description (optional) |
| `created_at` | String | NOT NULL | Creation timestamp (milliseconds) |
| `updated_at` | String | NOT NULL | Last update timestamp (milliseconds) |

#### Model Definition

```javascript
const MasterRecord = require('@bookbag/masterrecord').model;

class Workspace extends MasterRecord {
  id(db) {
    db.integer().notNullable().primaryKey();
  }

  name(db) {
    db.string().notNullable();
  }

  description(db) {
    db.string();
  }

  created_at(db) {
    db.string().notNullable();
  }

  updated_at(db) {
    db.string().notNullable();
  }

  // Relationships
  Users(db) {
    db.hasMany('WorkspaceUser', 'workspace_id');
  }

  Models(db) {
    db.hasMany('WorkspaceModel', 'workspace_id');
  }

  Chats(db) {
    db.hasMany('WorkspaceChat', 'workspace_id');
  }
}

module.exports = Workspace;
```

#### Example Record

```json
{
  "id": 1,
  "name": "Engineering Team",
  "description": "Workspace for engineering team collaboration",
  "created_at": "1731234567890",
  "updated_at": "1731234567890"
}
```

---

### WorkspaceUser Table

Junction table linking users to workspaces with role assignment.

**Table Name:** `WorkspaceUser`

**Model File:** `/components/workspace/app/models/workspaceUser.js`

#### Schema

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| `workspace_id` | Integer | NOT NULL, FOREIGN KEY | References Workspace.id |
| `user_id` | Integer | NOT NULL | References User.id (from user component) |
| `role` | String | NOT NULL, DEFAULT: "member" | User role: "owner", "admin", or "member" |
| `created_at` | String | NOT NULL | Creation timestamp (milliseconds) |
| `updated_at` | String | NOT NULL | Last update timestamp (milliseconds) |

#### Model Definition

```javascript
const MasterRecord = require('@bookbag/masterrecord').model;

class WorkspaceUser extends MasterRecord {
  id(db) {
    db.integer().notNullable().primaryKey();
  }

  workspace_id(db) {
    db.integer().notNullable();
  }

  user_id(db) {
    db.integer().notNullable();
  }

  role(db) {
    db.string().notNullable().defaultTo('member');
  }

  created_at(db) {
    db.string().notNullable();
  }

  updated_at(db) {
    db.string().notNullable();
  }

  // Relationships
  Workspace(db) {
    db.belongsTo('Workspace', 'workspace_id');
  }
}

module.exports = WorkspaceUser;
```

#### Role Values

- `"owner"` - Workspace owner (highest permissions)
- `"admin"` - Administrative privileges
- `"member"` - Standard member (default)

#### Example Record

```json
{
  "id": 1,
  "workspace_id": 1,
  "user_id": 5,
  "role": "admin",
  "created_at": "1731234567890",
  "updated_at": "1731234567890"
}
```

#### Composite Uniqueness

While not enforced by database constraints, each user should only have one role per workspace. Applications should ensure `(workspace_id, user_id)` combinations are unique.

---

### WorkspaceModel Table

Junction table linking AI models to workspaces.

**Table Name:** `WorkspaceModel`

**Model File:** `/components/workspace/app/models/workspaceModel.js`

#### Schema

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| `workspace_id` | Integer | NOT NULL, FOREIGN KEY | References Workspace.id |
| `model_id` | Integer | NOT NULL | References Model.id (from model component) |
| `created_at` | String | NOT NULL | Creation timestamp (milliseconds) |
| `updated_at` | String | NOT NULL | Last update timestamp (milliseconds) |

#### Model Definition

```javascript
const MasterRecord = require('@bookbag/masterrecord').model;

class WorkspaceModel extends MasterRecord {
  id(db) {
    db.integer().notNullable().primaryKey();
  }

  workspace_id(db) {
    db.integer().notNullable();
  }

  model_id(db) {
    db.integer().notNullable();
  }

  created_at(db) {
    db.string().notNullable();
  }

  updated_at(db) {
    db.string().notNullable();
  }

  // Relationships
  Workspace(db) {
    db.belongsTo('Workspace', 'workspace_id');
  }
}

module.exports = WorkspaceModel;
```

#### Example Record

```json
{
  "id": 1,
  "workspace_id": 1,
  "model_id": 10,
  "created_at": "1731234567890",
  "updated_at": "1731234567890"
}
```

#### Composite Uniqueness

Multiple records with the same `(workspace_id, model_id)` should be avoided. Applications should prevent duplicate model assignments.

---

### WorkspaceChat Table

Junction table linking chats to workspaces.

**Table Name:** `WorkspaceChat`

**Model File:** `/components/workspace/app/models/workspaceChat.js`

#### Schema

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| `workspace_id` | Integer | NOT NULL, FOREIGN KEY | References Workspace.id |
| `chat_id` | Integer | NOT NULL | References Chat.id (from chat component) |
| `created_at` | String | NOT NULL | Creation timestamp (milliseconds) |
| `updated_at` | String | NOT NULL | Last update timestamp (milliseconds) |

#### Model Definition

```javascript
const MasterRecord = require('@bookbag/masterrecord').model;

class WorkspaceChat extends MasterRecord {
  id(db) {
    db.integer().notNullable().primaryKey();
  }

  workspace_id(db) {
    db.integer().notNullable();
  }

  chat_id(db) {
    db.integer().notNullable();
  }

  created_at(db) {
    db.string().notNullable();
  }

  updated_at(db) {
    db.string().notNullable();
  }

  // Relationships
  Workspace(db) {
    db.belongsTo('Workspace', 'workspace_id');
  }
}

module.exports = WorkspaceChat;
```

#### Example Record

```json
{
  "id": 1,
  "workspace_id": 1,
  "chat_id": 123,
  "created_at": "1731234567890",
  "updated_at": "1731234567890"
}
```

#### Multi-Workspace Chats

A chat can belong to multiple workspaces. Multiple `WorkspaceChat` records can reference the same `chat_id` with different `workspace_id` values.

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────────┐
│    Workspace    │
│  (Core Entity)  │
└────────┬────────┘
         │
         ├───────────────┐
         │               │
         ↓               ↓
┌────────────────┐  ┌────────────────┐
│ WorkspaceUser  │  │ WorkspaceModel │
│  (Many-to-Many)│  │  (Many-to-Many)│
│                │  │                │
│  user_id ─────────→ User (user component)
│  workspace_id  │  │  model_id ────────→ Model (model component)
└────────────────┘  └────────────────┘

         │
         ↓
┌────────────────┐
│ WorkspaceChat  │
│  (Many-to-Many)│
│                │
│  chat_id ──────────→ Chat (chat component)
│  workspace_id  │
└────────────────┘
```

### Workspace Relationships

#### 1. Workspace → WorkspaceUser (One-to-Many)

```javascript
// Get workspace with all users
const workspace = workspaceContext.Workspace
  .where(w => w.id == $$, workspaceId)
  .include('Users')
  .single();

// workspace.Users is an array of WorkspaceUser records
```

#### 2. Workspace → WorkspaceModel (One-to-Many)

```javascript
// Get workspace with all models
const workspace = workspaceContext.Workspace
  .where(w => w.id == $$, workspaceId)
  .include('Models')
  .single();

// workspace.Models is an array of WorkspaceModel records
```

#### 3. Workspace → WorkspaceChat (One-to-Many)

```javascript
// Get workspace with all chats
const workspace = workspaceContext.Workspace
  .where(w => w.id == $$, workspaceId)
  .include('Chats')
  .single();

// workspace.Chats is an array of WorkspaceChat records
```

### Cross-Component Relationships

#### WorkspaceUser → User (Many-to-One)

```javascript
// Get workspace user with user details
const workspaceUsers = workspaceContext.WorkspaceUser
  .where(wu => wu.workspace_id == $$, workspaceId)
  .toList();

// For each workspaceUser, fetch user details from userContext
for (const wu of workspaceUsers) {
  const user = userContext.User
    .where(u => u.id == $$, wu.user_id)
    .single();

  wu.userDetails = user;
}
```

#### WorkspaceModel → Model (Many-to-One)

```javascript
// Get workspace models with model details
const workspaceModels = workspaceContext.WorkspaceModel
  .where(wm => wm.workspace_id == $$, workspaceId)
  .toList();

// For each workspaceModel, fetch model details from modelContext
for (const wm of workspaceModels) {
  const model = modelContext.Model
    .where(m => m.id == $$, wm.model_id)
    .single();

  wm.modelDetails = model;
}
```

#### WorkspaceChat → Chat (Many-to-One)

```javascript
// Get workspace chats with chat details
const workspaceChats = workspaceContext.WorkspaceChat
  .where(wc => wc.workspace_id == $$, workspaceId)
  .toList();

// For each workspaceChat, fetch chat details from chatContext
for (const wc of workspaceChats) {
  const chat = chatContext.Chat
    .where(c => c.id == $$, wc.chat_id)
    .single();

  wc.chatDetails = chat;
}
```

---

## Common Queries

### Workspace Queries

#### Create Workspace

```javascript
const workspace = new workspaceContext.Workspace();
workspace.name = 'Engineering Team';
workspace.description = 'Workspace for engineering';
workspace.created_at = Date.now().toString();
workspace.updated_at = Date.now().toString();

workspaceContext.Workspace.add(workspace);
workspaceContext.saveChanges();

console.log('Workspace created:', workspace.id);
```

#### Update Workspace

```javascript
const workspace = workspaceContext.Workspace
  .where(w => w.id == $$, workspaceId)
  .single();

if (workspace) {
  workspace.name = 'Updated Name';
  workspace.updated_at = Date.now().toString();
  workspaceContext.saveChanges();
}
```

#### Delete Workspace (with cascading)

```javascript
// 1. Delete workspace
const workspace = workspaceContext.Workspace
  .where(w => w.id == $$, workspaceId)
  .single();

if (workspace) {
  // 2. Delete all related records
  const users = workspaceContext.WorkspaceUser
    .where(wu => wu.workspace_id == $$, workspaceId)
    .toList();

  for (const user of users) {
    workspaceContext.WorkspaceUser.remove(user);
  }

  const models = workspaceContext.WorkspaceModel
    .where(wm => wm.workspace_id == $$, workspaceId)
    .toList();

  for (const model of models) {
    workspaceContext.WorkspaceModel.remove(model);
  }

  const chats = workspaceContext.WorkspaceChat
    .where(wc => wc.workspace_id == $$, workspaceId)
    .toList();

  for (const chat of chats) {
    workspaceContext.WorkspaceChat.remove(chat);
  }

  // 3. Delete workspace
  workspaceContext.Workspace.remove(workspace);
  workspaceContext.saveChanges();
}
```

#### Search Workspaces

```javascript
// Case-insensitive search by name or description
const searchTerm = 'engineering';
const workspaces = workspaceContext.Workspace
  .where(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.description.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .toList();
```

### User Membership Queries

#### Add User to Workspace

```javascript
const workspaceUser = new workspaceContext.WorkspaceUser();
workspaceUser.workspace_id = workspaceId;
workspaceUser.user_id = userId;
workspaceUser.role = 'member';  // or 'admin', 'owner'
workspaceUser.created_at = Date.now().toString();
workspaceUser.updated_at = Date.now().toString();

workspaceContext.WorkspaceUser.add(workspaceUser);
workspaceContext.saveChanges();
```

#### Check User Membership

```javascript
const workspaceUser = workspaceContext.WorkspaceUser
  .where(wu => wu.workspace_id == $$ && wu.user_id == $$, workspaceId, userId)
  .single();

const isMember = workspaceUser !== null;
const role = workspaceUser ? workspaceUser.role : null;
```

#### Get All Users in Workspace

```javascript
const workspaceUsers = workspaceContext.WorkspaceUser
  .where(wu => wu.workspace_id == $$, workspaceId)
  .toList();

// Fetch user details
const usersWithDetails = workspaceUsers.map(wu => {
  const user = userContext.User
    .where(u => u.id == $$, wu.user_id)
    .single();

  return {
    user_id: wu.user_id,
    role: wu.role,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`
  };
});
```

#### Get All Workspaces for User

```javascript
const workspaceUsers = workspaceContext.WorkspaceUser
  .where(wu => wu.user_id == $$, userId)
  .include('Workspace')
  .toList();

const workspaces = workspaceUsers.map(wu => ({
  ...wu.Workspace,
  role: wu.role
}));
```

#### Update User Role

```javascript
const workspaceUser = workspaceContext.WorkspaceUser
  .where(wu => wu.workspace_id == $$ && wu.user_id == $$, workspaceId, userId)
  .single();

if (workspaceUser) {
  workspaceUser.role = 'admin';
  workspaceUser.updated_at = Date.now().toString();
  workspaceContext.saveChanges();
}
```

#### Remove User from Workspace

```javascript
const workspaceUser = workspaceContext.WorkspaceUser
  .where(wu => wu.workspace_id == $$ && wu.user_id == $$, workspaceId, userId)
  .single();

if (workspaceUser) {
  workspaceContext.WorkspaceUser.remove(workspaceUser);
  workspaceContext.saveChanges();
}
```

### Model Assignment Queries

#### Assign Models to Workspace (Replace)

```javascript
// 1. Remove existing models
const existing = workspaceContext.WorkspaceModel
  .where(wm => wm.workspace_id == $$, workspaceId)
  .toList();

for (const wm of existing) {
  workspaceContext.WorkspaceModel.remove(wm);
}

// 2. Add new models
const modelIds = [10, 20, 30];
for (const modelId of modelIds) {
  const workspaceModel = new workspaceContext.WorkspaceModel();
  workspaceModel.workspace_id = workspaceId;
  workspaceModel.model_id = modelId;
  workspaceModel.created_at = Date.now().toString();
  workspaceModel.updated_at = Date.now().toString();

  workspaceContext.WorkspaceModel.add(workspaceModel);
}

workspaceContext.saveChanges();
```

#### Get Models for Workspace

```javascript
const workspaceModels = workspaceContext.WorkspaceModel
  .where(wm => wm.workspace_id == $$, workspaceId)
  .toList();

// Fetch model details
const models = workspaceModels.map(wm => {
  const model = modelContext.Model
    .where(m => m.id == $$, wm.model_id)
    .single();

  return model;
});
```

#### Check if Model is Allowed in Workspace

```javascript
const workspaceModel = workspaceContext.WorkspaceModel
  .where(wm => wm.workspace_id == $$ && wm.model_id == $$, workspaceId, modelId)
  .single();

const isAllowed = workspaceModel !== null;
```

### Chat Linkage Queries

#### Link Chat to Workspace

```javascript
const workspaceChat = new workspaceContext.WorkspaceChat();
workspaceChat.workspace_id = workspaceId;
workspaceChat.chat_id = chatId;
workspaceChat.created_at = Date.now().toString();
workspaceChat.updated_at = Date.now().toString();

workspaceContext.WorkspaceChat.add(workspaceChat);
workspaceContext.saveChanges();
```

#### Get All Chats in Workspace

```javascript
const workspaceChats = workspaceContext.WorkspaceChat
  .where(wc => wc.workspace_id == $$, workspaceId)
  .toList();

const chatIds = workspaceChats.map(wc => wc.chat_id);

// Fetch chat details (only active chats)
const chats = chatContext.Chat
  .where(c => chatIds.includes(c.id))
  .where(c => c.is_archived == false)
  .where(c => c.is_deleted == false)
  .orderBy(c => c.updated_at, 'desc')
  .toList();
```

#### Get Workspaces for Chat

```javascript
const workspaceChats = workspaceContext.WorkspaceChat
  .where(wc => wc.chat_id == $$, chatId)
  .toList();

const workspaceIds = workspaceChats.map(wc => wc.workspace_id);

// Fetch workspace details
const workspaces = workspaceContext.Workspace
  .where(w => workspaceIds.includes(w.id))
  .toList();
```

#### Get Allowed Models for Chat (Union across workspaces)

```javascript
// 1. Find all workspaces containing the chat
const workspaceChats = workspaceContext.WorkspaceChat
  .where(wc => wc.chat_id == $$, chatId)
  .toList();

const workspaceIds = workspaceChats.map(wc => wc.workspace_id);

// 2. Get all models from those workspaces
const workspaceModels = workspaceContext.WorkspaceModel
  .where(wm => workspaceIds.includes(wm.workspace_id))
  .toList();

// 3. Get unique model IDs (union)
const modelIds = [...new Set(workspaceModels.map(wm => wm.model_id))];

// 4. Fetch model details
const models = modelContext.Model
  .where(m => modelIds.includes(m.id))
  .toList();
```

---

## Migrations

### Initial Migration

**File:** `/components/workspace/app/models/db/migrations/1759205345674_Init_migration.js`

**Migration Timestamp:** `1759205345674`

#### Up Migration (Create Tables)

```javascript
async up(context) {
  // Create Workspace table
  await context.createTable('Workspace', table => {
    table.id = table.integer().notNullable().primaryKey();
    table.name = table.string().notNullable();
    table.description = table.string();
    table.created_at = table.string().notNullable();
    table.updated_at = table.string().notNullable();
  });

  // Create WorkspaceUser table
  await context.createTable('WorkspaceUser', table => {
    table.id = table.integer().notNullable().primaryKey();
    table.workspace_id = table.integer().notNullable();
    table.user_id = table.integer().notNullable();
    table.role = table.string().notNullable().defaultTo('member');
    table.created_at = table.string().notNullable();
    table.updated_at = table.string().notNullable();
  });

  // Create WorkspaceModel table
  await context.createTable('WorkspaceModel', table => {
    table.id = table.integer().notNullable().primaryKey();
    table.workspace_id = table.integer().notNullable();
    table.model_id = table.integer().notNullable();
    table.created_at = table.string().notNullable();
    table.updated_at = table.string().notNullable();
  });

  // Create WorkspaceChat table
  await context.createTable('WorkspaceChat', table => {
    table.id = table.integer().notNullable().primaryKey();
    table.workspace_id = table.integer().notNullable();
    table.chat_id = table.integer().notNullable();
    table.created_at = table.string().notNullable();
    table.updated_at = table.string().notNullable();
  });
}
```

#### Down Migration (Drop Tables)

```javascript
async down(context) {
  await context.dropTable('WorkspaceChat');
  await context.dropTable('WorkspaceModel');
  await context.dropTable('WorkspaceUser');
  await context.dropTable('Workspace');
}
```

### Running Migrations

```bash
# Run pending migrations
masterrecord update-database workspace

# Rollback last migration
masterrecord rollback workspace
```

---

## Best Practices

### 1. Always Use Timestamps

```javascript
// Always set both timestamps
const workspace = new workspaceContext.Workspace();
workspace.created_at = Date.now().toString();
workspace.updated_at = Date.now().toString();

// Always update updated_at on changes
workspace.name = 'New Name';
workspace.updated_at = Date.now().toString();
workspaceContext.saveChanges();
```

### 2. Validate Foreign Keys

```javascript
// Validate workspace exists before creating WorkspaceUser
const workspace = workspaceContext.Workspace
  .where(w => w.id == $$, workspaceId)
  .single();

if (!workspace) {
  throw new Error('Workspace not found');
}

// Validate user exists (from userContext)
const user = userContext.User
  .where(u => u.id == $$, userId)
  .single();

if (!user) {
  throw new Error('User not found');
}

// Now safe to create WorkspaceUser
const workspaceUser = new workspaceContext.WorkspaceUser();
workspaceUser.workspace_id = workspaceId;
workspaceUser.user_id = userId;
// ...
```

### 3. Enforce Unique Constraints

```javascript
// Check for existing membership before adding
const existing = workspaceContext.WorkspaceUser
  .where(wu => wu.workspace_id == $$ && wu.user_id == $$, workspaceId, userId)
  .single();

if (existing) {
  throw new Error('User is already a member of this workspace');
}

// Safe to add
const workspaceUser = new workspaceContext.WorkspaceUser();
// ...
```

### 4. Cascading Deletes

```javascript
// Always clean up related records when deleting workspace
async function deleteWorkspace(workspaceId) {
  // 1. Remove users
  const users = workspaceContext.WorkspaceUser
    .where(wu => wu.workspace_id == $$, workspaceId)
    .toList();
  users.forEach(u => workspaceContext.WorkspaceUser.remove(u));

  // 2. Remove models
  const models = workspaceContext.WorkspaceModel
    .where(wm => wm.workspace_id == $$, workspaceId)
    .toList();
  models.forEach(m => workspaceContext.WorkspaceModel.remove(m));

  // 3. Remove chats
  const chats = workspaceContext.WorkspaceChat
    .where(wc => wc.workspace_id == $$, workspaceId)
    .toList();
  chats.forEach(c => workspaceContext.WorkspaceChat.remove(c));

  // 4. Remove workspace
  const workspace = workspaceContext.Workspace
    .where(w => w.id == $$, workspaceId)
    .single();
  workspaceContext.Workspace.remove(workspace);

  // 5. Save all changes
  workspaceContext.saveChanges();
}
```

### 5. Use Parameterized Queries

```javascript
// GOOD - Use parameterized queries
const workspace = workspaceContext.Workspace
  .where(w => w.id == $$, workspaceId)
  .single();

// BAD - Avoid string interpolation (SQL injection risk)
const workspace = workspaceContext.Workspace
  .raw(`SELECT * FROM Workspace WHERE id = ${workspaceId}`)
  .single();
```

### 6. Handle Null Checks

```javascript
// Always check for null before accessing properties
const workspace = workspaceContext.Workspace
  .where(w => w.id == $$, workspaceId)
  .single();

if (!workspace) {
  return { success: false, error: 'Workspace not found' };
}

// Safe to access workspace properties
console.log(workspace.name);
```

### 7. Batch Operations

```javascript
// Use single saveChanges() for multiple operations
const workspace1 = new workspaceContext.Workspace();
workspace1.name = 'Workspace 1';
workspace1.created_at = Date.now().toString();
workspace1.updated_at = Date.now().toString();

const workspace2 = new workspaceContext.Workspace();
workspace2.name = 'Workspace 2';
workspace2.created_at = Date.now().toString();
workspace2.updated_at = Date.now().toString();

workspaceContext.Workspace.add(workspace1);
workspaceContext.Workspace.add(workspace2);

// Single save for both
workspaceContext.saveChanges();
```

### 8. Transaction Safety

```javascript
// Wrap complex operations in try-catch
try {
  // Multiple related operations
  const workspace = new workspaceContext.Workspace();
  workspace.name = 'New Workspace';
  workspace.created_at = Date.now().toString();
  workspace.updated_at = Date.now().toString();
  workspaceContext.Workspace.add(workspace);
  workspaceContext.saveChanges();

  const workspaceUser = new workspaceContext.WorkspaceUser();
  workspaceUser.workspace_id = workspace.id;
  workspaceUser.user_id = userId;
  workspaceUser.role = 'owner';
  workspaceUser.created_at = Date.now().toString();
  workspaceUser.updated_at = Date.now().toString();
  workspaceContext.WorkspaceUser.add(workspaceUser);
  workspaceContext.saveChanges();

  return { success: true, workspace };
} catch (error) {
  console.error('Error creating workspace:', error);
  return { success: false, error: error.message };
}
```

---

## Related Documentation

- **[README.md](./README.md)** - Component overview and architecture
- **[API.md](./API.md)** - Complete API reference

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
