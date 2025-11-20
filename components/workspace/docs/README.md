# Workspace Component Documentation

Comprehensive multi-tenant workspace management system with role-based access control for Bookbag CE.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Integration](#integration)
- [Related Documentation](#related-documentation)

---

## Overview

The Workspace component provides multi-tenant workspace management with role-based access control for Bookbag CE. It enables organizations to create isolated workspaces, assign users with specific roles, configure allowed AI models, and manage chats within workspace contexts. Each workspace acts as a container for users, chats, and AI model configurations.

**Component Path:** `components/workspace/`
**API Prefix:** `/bb-workspace/api/`
**Database Context:** `workspaceContext`
**Storage Location:** `db/development.sqlite3`

---

## Key Features

### Workspace Management
- **Create Workspaces** - Create isolated workspace containers
- **Update Workspaces** - Modify workspace name and description
- **Delete Workspaces** - Remove workspaces and associated data
- **List Workspaces** - View all workspaces with search filtering
- **Get Workspace Details** - Retrieve workspace with users and models

### User Management
- **Assign Users** - Add users to workspaces with specific roles
- **Role-Based Access** - Three role types: Owner, Admin, Member
- **Bulk Assignment** - Replace all workspace users in single operation
- **User Verification** - Check workspace membership before actions
- **My Workspaces** - Get all workspaces for current user

### AI Model Configuration
- **Assign Models** - Configure which AI models are available
- **Bulk Model Assignment** - Replace all workspace models at once
- **Cross-Workspace Models** - Query allowed models across workspaces
- **Chat Model Restrictions** - Control model access per workspace

### Chat Integration
- **Workspace Chats** - View all chats within a workspace
- **Create Chats** - Create new chats scoped to workspace
- **Auto-Membership** - Creator automatically added as chat member
- **Chat Filtering** - Show only active (non-archived, non-deleted) chats

### Authorization
- **Admin-Only Actions** - Restrict create/update/delete to admins
- **Membership Verification** - Validate user access to workspace data
- **Role Hierarchies** - Owner → Admin → Member permission levels
- **Cross-Component Auth** - Integrate with User component authentication

---

## Architecture

### Component Structure

```
components/workspace/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       └── workspaceController.js     # API endpoints
│   ├── models/
│   │   ├── workspaceContext.js            # Database context
│   │   ├── workspace.js                   # Workspace entity model
│   │   ├── workspaceUser.js               # User membership model
│   │   ├── workspaceModel.js              # Model assignment model
│   │   ├── workspaceChat.js               # Chat linkage model
│   │   └── db/
│   │       └── migrations/
│   │           └── 1759205345674_Init_migration.js
│   └── service/                           # (empty - no service layer)
├── config/
│   ├── routes.js                          # Route definitions
│   ├── initializers/
│   │   └── config.js                      # (empty)
│   └── environments/
│       ├── env.development.json
│       └── env.production.json
├── db/
│   └── development.sqlite3                # SQLite database
└── docs/
    ├── README.md                          # This file
    ├── API.md                             # API documentation
    └── DATABASE.md                        # Database schema
```

### Request Flow

```
┌─────────────┐
│   Client    │
│  (Request)  │
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│  MasterController    │
│     (Router)         │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ workspaceController  │ ← Validates admin role
│   (API Action)       │ ← Checks workspace membership
└──────┬───────────────┘ ← Queries database
       │
       ↓
┌──────────────────────┐
│  workspaceContext    │ ← Cross-component queries
│  (ORM Queries)       │ ← User, Chat, Model contexts
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│   Database           │
│  (SQLite)            │ ← Workspace tables
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│   Response           │
│  { success, data }   │
└──────────────────────┘
```

### Authorization Flow

```
┌─────────────┐
│   Request   │
│ (w/ cookie) │
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│  authService         │ ← Validate session
│  (currentUser)       │ ← Get user ID and role
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  Check Action Type   │
└──────┬───────────────┘
       │
       ├──→ Admin Action? (create/update/delete)
       │    └──→ Require isAdmin = true
       │
       └──→ Workspace Action? (get/chats/createChat)
            └──→ Verify WorkspaceUser membership
```

### Data Model Relationships

```
┌─────────────┐
│  Workspace  │
└──────┬──────┘
       │
       ├──→ hasMany(WorkspaceUser)
       │    └──→ user_id → User (from user component)
       │
       ├──→ hasMany(WorkspaceModel)
       │    └──→ model_id → Model (from model component)
       │
       └──→ hasMany(WorkspaceChat)
            └──→ chat_id → Chat (from chat component)
```

---

## Quick Start

### Create a Workspace

```javascript
// Frontend - Create workspace (admin only)
const response = await fetch('/bb-workspace/api/workspace/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Engineering Team',
    description: 'Workspace for engineering team collaboration'
  })
});

const data = await response.json();
console.log('Workspace created:', data.workspace);
// {
//   id: 1,
//   name: 'Engineering Team',
//   description: 'Workspace for engineering team collaboration',
//   created_at: '1731234567890',
//   updated_at: '1731234567890'
// }
```

### Assign Users to Workspace

```javascript
// Assign users with roles (admin only)
const response = await fetch('/bb-workspace/api/workspace/assign-users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 1,
    users: [
      { user_id: 1, role: 'owner' },
      { user_id: 2, role: 'admin' },
      { user_id: 3, role: 'member' }
    ]
  })
});

const data = await response.json();
console.log('Users assigned:', data.success);
```

### Assign AI Models to Workspace

```javascript
// Configure allowed AI models (admin only)
const response = await fetch('/bb-workspace/api/workspace/assign-models', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 1,
    models: [
      { model_id: 10 },  // GPT-4
      { model_id: 20 },  // Claude
      { model_id: 30 }   // Gemini
    ]
  })
});

const data = await response.json();
console.log('Models assigned:', data.success);
```

### Get My Workspaces

```javascript
// Get all workspaces for current user
const response = await fetch('/bb-workspace/api/my');
const data = await response.json();

console.log('My workspaces:', data.workspaces);
// [
//   {
//     id: 1,
//     name: 'Engineering Team',
//     description: 'Workspace for engineering team collaboration',
//     role: 'admin',
//     created_at: '1731234567890'
//   },
//   ...
// ]
```

### Create Chat in Workspace

```javascript
// Create new chat within workspace (members only)
const response = await fetch('/bb-workspace/api/workspace/chat/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 1,
    chatTitle: 'Project Discussion',
    modelId: 10
  })
});

const data = await response.json();
console.log('Chat created:', data.chat);
// {
//   id: 123,
//   title: 'Project Discussion',
//   workspace_id: 1,
//   created_at: '1731234567890'
// }
```

---

## Core Concepts

### Workspace Roles

Workspaces support three hierarchical roles:

**1. Owner (role = "owner")**
- Highest level of access
- Full control over workspace
- Can perform all admin actions
- Typically the workspace creator

**2. Admin (role = "admin")**
- Administrative privileges
- Can manage workspace settings
- Can assign users and models
- Cannot delete workspace

**3. Member (role = "member")**
- Standard user access (default)
- Can view workspace details
- Can create and participate in chats
- Cannot modify workspace settings

Role values are stored as strings in the database.

### Multi-Tenancy Model

Workspaces provide **multi-tenant isolation**:

1. **Data Isolation** - Each workspace has separate users, chats, and models
2. **Access Control** - Users can only access workspaces they're members of
3. **Resource Scoping** - Chats and models scoped to specific workspaces
4. **Independent Configuration** - Each workspace has unique settings

### Cross-Component Integration

The Workspace component integrates with three other components:

#### 1. User Component Integration

```javascript
// workspaceContext has access to userContext
const user = this._userContext.User.where(u => u.id == $$, userId).single();
```

- **WorkspaceUser.user_id** → References User from user component
- Used for membership verification and user details
- Authentication handled by authService from user component

#### 2. Chat Component Integration

```javascript
// workspaceContext has access to chatContext
const chat = this._chatContext.Chat.where(c => c.id == $$, chatId).single();
```

- **WorkspaceChat.chat_id** → References Chat from chat component
- Creates linkage between workspaces and chats
- Enables workspace-scoped chat access control

#### 3. Model Component Integration

```javascript
// workspaceContext has access to modelContext
const model = this._modelContext.Model.where(m => m.id == $$, modelId).single();
```

- **WorkspaceModel.model_id** → References Model from model component
- Controls which AI models are available in workspace
- Enables model restrictions per workspace

### Workspace Chat Management

Chats are linked to workspaces through the **WorkspaceChat** junction table:

#### Chat Creation Flow

```
User creates chat in workspace
    ↓
1. Verify user is workspace member
2. Create chat in chat component
3. Create WorkspaceChat linkage
4. Add creator as chat member
    ↓
Chat is now scoped to workspace
```

#### Chat Access Control

```javascript
// To access a chat, user must be:
// 1. Member of the workspace containing the chat
// 2. Member of the chat itself (via chat component)

const canAccess =
  isWorkspaceMember(userId, workspaceId) &&
  isChatMember(userId, chatId);
```

### AI Model Configuration

Workspaces control which AI models users can access:

#### Model Assignment Flow

```
Admin assigns models to workspace
    ↓
1. Validate admin permissions
2. Delete existing WorkspaceModel records
3. Create new WorkspaceModel records for each model
4. Save changes to database
    ↓
Only assigned models available in workspace
```

#### Cross-Workspace Model Discovery

```javascript
// Get all models allowed for a specific chat
// across all workspaces containing that chat

GET /bb-workspace/api/chat/allowed-models?chatId=123

// Returns union of model IDs from all workspaces
// that contain the chat
```

This allows chats to be in multiple workspaces with different model configurations.

### Search and Filtering

Workspaces support search functionality:

```javascript
// Search by name or description
GET /bb-workspace/api/workspace?q=engineering

// Returns workspaces where name or description contains "engineering"
```

Search is case-insensitive and uses SQL LIKE with wildcard matching.

---

## Usage Examples

### Backend - Controller Access

```javascript
class myController {
  constructor(req) {
    this._workspaceContext = req.workspaceContext;
    this._userContext = req.userContext;
    this._chatContext = req.chatContext;
    this._modelContext = req.modelContext;
    this._authService = req.authService;
  }

  async myMethod(obj) {
    // Get current user
    const currentUser = this._authService.currentUser(obj.request, this._userContext);

    if (!currentUser.isAuthenticated) {
      return this.returnJson({ success: false, error: 'Not authenticated' });
    }

    // Get all workspaces for user
    const workspaceUsers = this._workspaceContext.WorkspaceUser
      .where(wu => wu.user_id == $$, currentUser.id)
      .include('Workspace')
      .toList();

    const workspaces = workspaceUsers.map(wu => ({
      ...wu.Workspace,
      role: wu.role
    }));

    console.log('User workspaces:', workspaces);

    // Check if user is member of specific workspace
    const isMember = this._workspaceContext.WorkspaceUser
      .where(wu => wu.workspace_id == $$ && wu.user_id == $$, workspaceId, currentUser.id)
      .any();

    if (!isMember) {
      return this.returnJson({ success: false, error: 'Not a workspace member' });
    }

    // Get workspace with all related data
    const workspace = this._workspaceContext.Workspace
      .where(w => w.id == $$, workspaceId)
      .include('Users')
      .include('Models')
      .include('Chats')
      .single();

    console.log('Workspace details:', workspace);
  }
}
```

### Create Workspace Programmatically

```javascript
// Backend - Create workspace and assign owner
async createWorkspaceWithOwner(ownerId, name, description) {
  // Create workspace
  const workspace = new this._workspaceContext.Workspace();
  workspace.name = name;
  workspace.description = description;
  workspace.created_at = Date.now().toString();
  workspace.updated_at = Date.now().toString();

  this._workspaceContext.Workspace.add(workspace);
  this._workspaceContext.saveChanges();

  // Assign owner
  const workspaceUser = new this._workspaceContext.WorkspaceUser();
  workspaceUser.workspace_id = workspace.id;
  workspaceUser.user_id = ownerId;
  workspaceUser.role = 'owner';
  workspaceUser.created_at = Date.now().toString();
  workspaceUser.updated_at = Date.now().toString();

  this._workspaceContext.WorkspaceUser.add(workspaceUser);
  this._workspaceContext.saveChanges();

  return workspace;
}
```

### Assign Models to Workspace

```javascript
// Backend - Assign multiple models at once
async assignModelsToWorkspace(workspaceId, modelIds) {
  // Remove existing model assignments
  const existing = this._workspaceContext.WorkspaceModel
    .where(wm => wm.workspace_id == $$, workspaceId)
    .toList();

  for (const wm of existing) {
    this._workspaceContext.WorkspaceModel.remove(wm);
  }

  // Add new model assignments
  for (const modelId of modelIds) {
    const workspaceModel = new this._workspaceContext.WorkspaceModel();
    workspaceModel.workspace_id = workspaceId;
    workspaceModel.model_id = modelId;
    workspaceModel.created_at = Date.now().toString();
    workspaceModel.updated_at = Date.now().toString();

    this._workspaceContext.WorkspaceModel.add(workspaceModel);
  }

  this._workspaceContext.saveChanges();
}
```

### Get Workspace Chats

```javascript
// Backend - Get all active chats in workspace
async getWorkspaceChats(workspaceId) {
  // Get workspace chat linkages
  const workspaceChats = this._workspaceContext.WorkspaceChat
    .where(wc => wc.workspace_id == $$, workspaceId)
    .toList();

  const chatIds = workspaceChats.map(wc => wc.chat_id);

  if (chatIds.length === 0) {
    return [];
  }

  // Get chat details from chat component
  const chats = this._chatContext.Chat
    .where(c => chatIds.includes(c.id))
    .where(c => c.is_archived == false)
    .where(c => c.is_deleted == false)
    .orderBy(c => c.updated_at, 'desc')
    .toList();

  return chats;
}
```

### Check User Workspace Membership

```javascript
// Backend - Verify user access to workspace
async verifyWorkspaceMembership(userId, workspaceId) {
  const workspaceUser = this._workspaceContext.WorkspaceUser
    .where(wu => wu.workspace_id == $$ && wu.user_id == $$, workspaceId, userId)
    .single();

  if (!workspaceUser) {
    return { isMember: false, role: null };
  }

  return {
    isMember: true,
    role: workspaceUser.role,
    isOwner: workspaceUser.role === 'owner',
    isAdmin: workspaceUser.role === 'admin' || workspaceUser.role === 'owner',
    isMemberOnly: workspaceUser.role === 'member'
  };
}
```

### Get Allowed Models for Chat

```javascript
// Backend - Get union of models across workspaces
async getAllowedModelsForChat(chatId) {
  // Find all workspaces containing this chat
  const workspaceChats = this._workspaceContext.WorkspaceChat
    .where(wc => wc.chat_id == $$, chatId)
    .toList();

  if (workspaceChats.length === 0) {
    return [];
  }

  const workspaceIds = workspaceChats.map(wc => wc.workspace_id);

  // Get all models assigned to these workspaces
  const workspaceModels = this._workspaceContext.WorkspaceModel
    .where(wm => workspaceIds.includes(wm.workspace_id))
    .toList();

  // Return unique model IDs
  const modelIds = [...new Set(workspaceModels.map(wm => wm.model_id))];

  // Get model details
  const models = this._modelContext.Model
    .where(m => modelIds.includes(m.id))
    .toList();

  return models;
}
```

---

## Configuration

### Environment Variables

```javascript
// config/environments/env.development.json
{
  "database": {
    "type": "sqlite3",
    "connection": {
      "filename": "./components/workspace/db/development.sqlite3"
    }
  }
}
```

```javascript
// config/environments/env.production.json
{
  "database": {
    "type": "sqlite3",
    "connection": {
      "filename": "/var/app/db/workspace.sqlite3"
    }
  }
}
```

### Default Settings

- **Default Role:** "member"
- **Database Type:** SQLite3
- **Auto-increment IDs:** Enabled
- **Timestamps:** created_at, updated_at (milliseconds)

### Routes Configuration

All routes are prefixed with `bb-workspace`:

```javascript
// config/routes.js
router.route("bb-workspace/api/workspace", "api/workspace#list", "get");
router.route("bb-workspace/api/workspace/get", "api/workspace#get", "get");
router.route("bb-workspace/api/workspace/create", "api/workspace#create", "post");
router.route("bb-workspace/api/workspace/update", "api/workspace#update", "post");
router.route("bb-workspace/api/workspace/delete", "api/workspace#remove", "post");
router.route("bb-workspace/api/workspace/assign-users", "api/workspace#assignUsers", "post");
router.route("bb-workspace/api/workspace/assign-models", "api/workspace#assignModels", "post");
router.route("bb-workspace/api/my", "api/workspace#my", "get");
router.route("bb-workspace/api/workspace/chats", "api/workspace#chats", "get");
router.route("bb-workspace/api/workspace/chat/create", "api/workspace#createChat", "post");
router.route("bb-workspace/api/chat/allowed-models", "api/workspace#chatAllowedModels", "get");
```

---

## Integration

### Integration with User Component

The Workspace component requires the User component for authentication and user management:

```javascript
// User component provides authentication
const currentUser = req.authService.currentUser(req.request, req.userContext);

// Workspace uses user IDs to link members
const workspaceUser = new WorkspaceUser();
workspaceUser.user_id = currentUser.id;  // Reference to User.id

// Access user details via cross-component query
const user = req.userContext.User.where(u => u.id == $$, userId).single();
console.log('User name:', user.first_name, user.last_name);
console.log('User email:', user.email);
```

### Integration with Chat Component

Workspaces contain and manage chats:

```javascript
// Create chat via chat component
const chat = new req.chatContext.Chat();
chat.title = 'Workspace Discussion';
chat.model_id = modelId;
chat.user_id = currentUser.id;
chat.created_at = Date.now().toString();
req.chatContext.Chat.add(chat);
req.chatContext.saveChanges();

// Link chat to workspace
const workspaceChat = new WorkspaceChat();
workspaceChat.workspace_id = workspaceId;
workspaceChat.chat_id = chat.id;
workspaceChat.created_at = Date.now().toString();
req.workspaceContext.WorkspaceChat.add(workspaceChat);
req.workspaceContext.saveChanges();
```

### Integration with Model Component

Workspaces control which AI models are available:

```javascript
// Query model details
const model = req.modelContext.Model
  .where(m => m.id == $$, modelId)
  .single();

console.log('Model name:', model.name);
console.log('Model provider:', model.provider);

// Assign model to workspace
const workspaceModel = new WorkspaceModel();
workspaceModel.workspace_id = workspaceId;
workspaceModel.model_id = model.id;
req.workspaceContext.WorkspaceModel.add(workspaceModel);
req.workspaceContext.saveChanges();
```

### Available in All Controllers

The `workspaceContext` is available in all controllers:

```javascript
class anyController {
  constructor(req) {
    this._workspaceContext = req.workspaceContext;  // Available everywhere
    this._userContext = req.userContext;            // For user queries
    this._chatContext = req.chatContext;            // For chat queries
    this._modelContext = req.modelContext;          // For model queries
  }
}
```

### Frontend Integration Example

```javascript
// React component example
import { useState, useEffect } from 'react';

function WorkspaceDashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [chats, setChats] = useState([]);

  // Load user's workspaces
  useEffect(() => {
    fetch('/bb-workspace/api/my')
      .then(res => res.json())
      .then(data => setWorkspaces(data.workspaces));
  }, []);

  // Load chats when workspace selected
  useEffect(() => {
    if (selectedWorkspace) {
      fetch(`/bb-workspace/api/workspace/chats?workspaceId=${selectedWorkspace.id}`)
        .then(res => res.json())
        .then(data => setChats(data.chats));
    }
  }, [selectedWorkspace]);

  // Create new chat in workspace
  const createChat = async (title, modelId) => {
    const response = await fetch('/bb-workspace/api/workspace/chat/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: selectedWorkspace.id,
        chatTitle: title,
        modelId: modelId
      })
    });

    const data = await response.json();
    if (data.success) {
      setChats([...chats, data.chat]);
    }
  };

  return (
    <div>
      <h1>My Workspaces</h1>
      <ul>
        {workspaces.map(ws => (
          <li key={ws.id} onClick={() => setSelectedWorkspace(ws)}>
            {ws.name} ({ws.role})
          </li>
        ))}
      </ul>

      {selectedWorkspace && (
        <div>
          <h2>{selectedWorkspace.name}</h2>
          <p>{selectedWorkspace.description}</p>

          <h3>Chats</h3>
          <ul>
            {chats.map(chat => (
              <li key={chat.id}>{chat.title}</li>
            ))}
          </ul>

          <button onClick={() => createChat('New Chat', 10)}>
            Create New Chat
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Related Documentation

- **[API.md](./API.md)** - Complete API reference with all endpoints
- **[DATABASE.md](./DATABASE.md)** - Database schema and queries

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
