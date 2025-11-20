# Workspace Component API Documentation

Complete API reference for all workspace management endpoints in Bookbag CE.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Workspace Management](#workspace-management)
  - [List Workspaces](#list-workspaces)
  - [Get Workspace](#get-workspace)
  - [Create Workspace](#create-workspace)
  - [Update Workspace](#update-workspace)
  - [Delete Workspace](#delete-workspace)
- [User Management](#user-management)
  - [Assign Users](#assign-users)
- [Model Management](#model-management)
  - [Assign Models](#assign-models)
- [User Access](#user-access)
  - [My Workspaces](#my-workspaces)
- [Chat Integration](#chat-integration)
  - [Get Workspace Chats](#get-workspace-chats)
  - [Create Chat](#create-chat)
  - [Get Allowed Models for Chat](#get-allowed-models-for-chat)
- [Error Handling](#error-handling)

---

## Overview

**Base URL:** `http://localhost:8080` (development)

**API Prefix:** `/bb-workspace/api/`

**Content-Type:** `application/json`

**Authentication:** Cookie-based session authentication (from user component)

---

## Authentication

All endpoints require authentication via the user component's session cookie. The `authService.currentUser()` method validates the session and extracts user information.

**Required Cookie:**
- `login` - Session token set by `/bb-user/api/auth/login`

**Authorization Levels:**
- **Admin Only** - Create, Update, Delete, Assign Users, Assign Models
- **Member** - Get, My, Chats, Create Chat, Allowed Models

---

## Workspace Management

### List Workspaces

Get a list of all workspaces with optional search filtering.

**Endpoint:** `GET /bb-workspace/api/workspace`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | No | Search query (filters by name or description) |

**Authorization:** Any authenticated user

**Request Example:**

```bash
# Get all workspaces
curl -X GET "http://localhost:8080/bb-workspace/api/workspace" \
  -H "Cookie: login=your-session-token"

# Search workspaces
curl -X GET "http://localhost:8080/bb-workspace/api/workspace?q=engineering" \
  -H "Cookie: login=your-session-token"
```

**Success Response (200):**

```json
{
  "success": true,
  "workspaces": [
    {
      "id": 1,
      "name": "Engineering Team",
      "description": "Workspace for engineering team collaboration",
      "created_at": "1731234567890",
      "updated_at": "1731234567890"
    },
    {
      "id": 2,
      "name": "Marketing Team",
      "description": "Marketing workspace",
      "created_at": "1731234578901",
      "updated_at": "1731234578901"
    }
  ]
}
```

**Notes:**
- Search is case-insensitive
- Searches both `name` and `description` fields
- Uses SQL LIKE with `%search%` pattern matching

---

### Get Workspace

Get detailed workspace information including assigned users and models.

**Endpoint:** `GET /bb-workspace/api/workspace/get`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workspaceId | integer | Yes | ID of the workspace |

**Authorization:** Any authenticated user

**Request Example:**

```bash
curl -X GET "http://localhost:8080/bb-workspace/api/workspace/get?workspaceId=1" \
  -H "Cookie: login=your-session-token"
```

**Success Response (200):**

```json
{
  "success": true,
  "workspace": {
    "id": 1,
    "name": "Engineering Team",
    "description": "Workspace for engineering team collaboration",
    "created_at": "1731234567890",
    "updated_at": "1731234567890",
    "users": [
      {
        "user_id": 1,
        "role": "owner",
        "name": "John Doe",
        "email": "john@example.com"
      },
      {
        "user_id": 2,
        "role": "admin",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      {
        "user_id": 3,
        "role": "member",
        "name": "Bob Johnson",
        "email": "bob@example.com"
      }
    ],
    "models": [
      {
        "model_id": 10,
        "name": "GPT-4",
        "provider": "openai"
      },
      {
        "model_id": 20,
        "name": "Claude 3 Sonnet",
        "provider": "anthropic"
      }
    ]
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Workspace not found"
}
```

**Notes:**
- Returns full user details from user component
- Returns full model details from model component
- Workspace must exist

---

### Create Workspace

Create a new workspace (admin only).

**Endpoint:** `POST /bb-workspace/api/workspace/create`

**Authorization:** Administrator only

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Workspace name |
| description | string | No | Workspace description |

**Request Example:**

```bash
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=your-session-token" \
  -d '{
    "name": "Engineering Team",
    "description": "Workspace for engineering team collaboration"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "workspace": {
    "id": 1,
    "name": "Engineering Team",
    "description": "Workspace for engineering team collaboration",
    "created_at": "1731234567890",
    "updated_at": "1731234567890"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": "Admin access required"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Workspace name is required"
}
```

**Notes:**
- Automatically sets `created_at` and `updated_at` timestamps
- Description is optional (empty string if not provided)

---

### Update Workspace

Update an existing workspace's name or description (admin only).

**Endpoint:** `POST /bb-workspace/api/workspace/update`

**Authorization:** Administrator only

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | integer | Yes | ID of workspace to update |
| name | string | No | New workspace name |
| description | string | No | New workspace description |

**Request Example:**

```bash
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=your-session-token" \
  -d '{
    "workspaceId": 1,
    "name": "Engineering & DevOps Team",
    "description": "Updated workspace description"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "workspace": {
    "id": 1,
    "name": "Engineering & DevOps Team",
    "description": "Updated workspace description",
    "created_at": "1731234567890",
    "updated_at": "1731234590123"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": "Admin access required"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Workspace not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Workspace ID is required"
}
```

**Notes:**
- Automatically updates `updated_at` timestamp
- Can update `name`, `description`, or both
- At least one field must be provided

---

### Delete Workspace

Delete a workspace and all associated data (admin only).

**Endpoint:** `POST /bb-workspace/api/workspace/delete`

**Authorization:** Administrator only

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | integer | Yes | ID of workspace to delete |

**Request Example:**

```bash
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/delete" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=your-session-token" \
  -d '{
    "workspaceId": 1
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Workspace deleted successfully"
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": "Admin access required"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Workspace not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Workspace ID is required"
}
```

**Notes:**
- **Cascading Delete:** Also removes:
  - All `WorkspaceUser` records
  - All `WorkspaceModel` records
  - All `WorkspaceChat` records
- **Does NOT delete:** Actual User, Model, or Chat records (only the linkages)
- This action is **irreversible**

---

## User Management

### Assign Users

Assign or reassign users to a workspace with specific roles (admin only).

**Endpoint:** `POST /bb-workspace/api/workspace/assign-users`

**Authorization:** Administrator only

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | integer | Yes | ID of workspace |
| users | array | Yes | Array of user assignments |
| users[].user_id | integer | Yes | User ID |
| users[].role | string | Yes | User role: "owner", "admin", or "member" |

**Request Example:**

```bash
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/assign-users" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=your-session-token" \
  -d '{
    "workspaceId": 1,
    "users": [
      {
        "user_id": 1,
        "role": "owner"
      },
      {
        "user_id": 2,
        "role": "admin"
      },
      {
        "user_id": 3,
        "role": "member"
      },
      {
        "user_id": 4,
        "role": "member"
      }
    ]
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Users assigned successfully",
  "assigned_count": 4
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": "Admin access required"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Workspace not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Workspace ID and users array are required"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Invalid role. Must be 'owner', 'admin', or 'member'"
}
```

**Notes:**
- **Replace Operation:** Deletes ALL existing users and adds the new list
- Default role is "member" if not specified
- Validates that user_id exists in user component
- Automatically sets `created_at` and `updated_at` timestamps

**Valid Roles:**
- `"owner"` - Full control, highest permissions
- `"admin"` - Administrative privileges
- `"member"` - Standard user (default)

---

## Model Management

### Assign Models

Assign or reassign AI models to a workspace (admin only).

**Endpoint:** `POST /bb-workspace/api/workspace/assign-models`

**Authorization:** Administrator only

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | integer | Yes | ID of workspace |
| models | array | Yes | Array of model assignments |
| models[].model_id | integer | Yes | Model ID from model component |

**Request Example:**

```bash
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/assign-models" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=your-session-token" \
  -d '{
    "workspaceId": 1,
    "models": [
      {
        "model_id": 10
      },
      {
        "model_id": 20
      },
      {
        "model_id": 30
      }
    ]
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Models assigned successfully",
  "assigned_count": 3
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": "Admin access required"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Workspace not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Workspace ID and models array are required"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Model ID 999 does not exist"
}
```

**Notes:**
- **Replace Operation:** Deletes ALL existing models and adds the new list
- Validates that model_id exists in model component
- Automatically sets `created_at` and `updated_at` timestamps
- Controls which AI models are available for chats in this workspace

---

## User Access

### My Workspaces

Get all workspaces the current user is a member of.

**Endpoint:** `GET /bb-workspace/api/my`

**Authorization:** Any authenticated user

**Request Example:**

```bash
curl -X GET "http://localhost:8080/bb-workspace/api/my" \
  -H "Cookie: login=your-session-token"
```

**Success Response (200):**

```json
{
  "success": true,
  "workspaces": [
    {
      "id": 1,
      "name": "Engineering Team",
      "description": "Workspace for engineering team collaboration",
      "role": "admin",
      "created_at": "1731234567890",
      "updated_at": "1731234567890"
    },
    {
      "id": 2,
      "name": "Marketing Team",
      "description": "Marketing workspace",
      "role": "member",
      "created_at": "1731234578901",
      "updated_at": "1731234578901"
    }
  ]
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Notes:**
- Returns workspaces ordered by `updated_at` (most recent first)
- Includes the user's role in each workspace
- Returns empty array if user is not a member of any workspace

---

## Chat Integration

### Get Workspace Chats

Get all active chats within a workspace (members only).

**Endpoint:** `GET /bb-workspace/api/workspace/chats`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workspaceId | integer | Yes | ID of the workspace |

**Authorization:** Workspace member (verified)

**Request Example:**

```bash
curl -X GET "http://localhost:8080/bb-workspace/api/workspace/chats?workspaceId=1" \
  -H "Cookie: login=your-session-token"
```

**Success Response (200):**

```json
{
  "success": true,
  "chats": [
    {
      "id": 123,
      "title": "Project Discussion",
      "model_id": 10,
      "user_id": 1,
      "is_archived": false,
      "is_deleted": false,
      "created_at": "1731234567890",
      "updated_at": "1731234590123"
    },
    {
      "id": 124,
      "title": "Sprint Planning",
      "model_id": 20,
      "user_id": 2,
      "is_archived": false,
      "is_deleted": false,
      "created_at": "1731234578901",
      "updated_at": "1731234591234"
    }
  ]
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": "You are not a member of this workspace"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Workspace not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Workspace ID is required"
}
```

**Notes:**
- Only returns **active** chats (`is_archived = false`, `is_deleted = false`)
- User must be a member of the workspace to view chats
- Results ordered by `updated_at` (most recent first)
- Returns empty array if no active chats exist

---

### Create Chat

Create a new chat within a workspace (members only).

**Endpoint:** `POST /bb-workspace/api/workspace/chat/create`

**Authorization:** Workspace member (verified)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| workspaceId | integer | Yes | ID of workspace |
| chatTitle | string | Yes | Title for the new chat |
| modelId | integer | Yes | AI model ID to use for chat |

**Request Example:**

```bash
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/chat/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=your-session-token" \
  -d '{
    "workspaceId": 1,
    "chatTitle": "Project Discussion",
    "modelId": 10
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "chat": {
    "id": 123,
    "title": "Project Discussion",
    "model_id": 10,
    "user_id": 1,
    "workspace_id": 1,
    "is_archived": false,
    "is_deleted": false,
    "created_at": "1731234567890",
    "updated_at": "1731234567890"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": "You are not a member of this workspace"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Workspace not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Workspace ID, chat title, and model ID are required"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Model ID 999 is not available in this workspace"
}
```

**Notes:**
- Creates chat in chat component
- Links chat to workspace via WorkspaceChat
- Automatically adds creator as chat member
- Validates model is assigned to workspace
- Sets `is_archived = false`, `is_deleted = false` by default

**Automatic Operations:**
1. Validate workspace membership
2. Validate model is assigned to workspace
3. Create chat in chat component
4. Create WorkspaceChat linkage
5. Add creator as chat member (via chat component)

---

### Get Allowed Models for Chat

Get the union of all models allowed across all workspaces containing a specific chat.

**Endpoint:** `GET /bb-workspace/api/chat/allowed-models`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chatId | integer | Yes | ID of the chat |

**Authorization:** Any authenticated user

**Request Example:**

```bash
curl -X GET "http://localhost:8080/bb-workspace/api/chat/allowed-models?chatId=123" \
  -H "Cookie: login=your-session-token"
```

**Success Response (200):**

```json
{
  "success": true,
  "models": [
    {
      "id": 10,
      "name": "GPT-4",
      "provider": "openai",
      "model_name": "gpt-4-turbo"
    },
    {
      "id": 20,
      "name": "Claude 3 Sonnet",
      "provider": "anthropic",
      "model_name": "claude-3-sonnet-20240229"
    },
    {
      "id": 30,
      "name": "Gemini Pro",
      "provider": "google",
      "model_name": "gemini-pro"
    }
  ]
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Chat not found in any workspace"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Chat ID is required"
}
```

**Notes:**
- Returns **union** of models from ALL workspaces containing the chat
- Chat can exist in multiple workspaces
- Useful for determining which models a user can switch to in a chat
- Returns empty array if chat is not in any workspace
- Returns model details from model component

**Use Case:**
A chat can be shared across multiple workspaces. This endpoint returns all models available across any workspace the chat belongs to, allowing users to switch models within the available set.

---

## Error Handling

### Common Error Responses

#### 400 Bad Request

Missing or invalid parameters.

```json
{
  "success": false,
  "error": "Validation error message"
}
```

#### 401 Unauthorized

User is not authenticated.

```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 403 Forbidden

User does not have required permissions.

```json
{
  "success": false,
  "error": "Admin access required"
}
```

or

```json
{
  "success": false,
  "error": "You are not a member of this workspace"
}
```

#### 404 Not Found

Resource does not exist.

```json
{
  "success": false,
  "error": "Workspace not found"
}
```

#### 500 Internal Server Error

Server error during processing.

```json
{
  "success": false,
  "error": "Internal server error",
  "details": "Error message details"
}
```

---

### Error Codes Summary

| Status Code | Meaning | Common Scenarios |
|-------------|---------|------------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Missing parameters, invalid data |
| 401 | Unauthorized | Not logged in, session expired |
| 403 | Forbidden | Insufficient permissions, not workspace member |
| 404 | Not Found | Workspace/chat/user/model not found |
| 500 | Server Error | Database error, unexpected exception |

---

## Complete API Reference Table

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/bb-workspace/api/workspace` | User | List all workspaces with optional search |
| GET | `/bb-workspace/api/workspace/get` | User | Get workspace details with users and models |
| POST | `/bb-workspace/api/workspace/create` | Admin | Create new workspace |
| POST | `/bb-workspace/api/workspace/update` | Admin | Update workspace name/description |
| POST | `/bb-workspace/api/workspace/delete` | Admin | Delete workspace and all associations |
| POST | `/bb-workspace/api/workspace/assign-users` | Admin | Assign/replace users with roles |
| POST | `/bb-workspace/api/workspace/assign-models` | Admin | Assign/replace AI models |
| GET | `/bb-workspace/api/my` | User | Get current user's workspaces |
| GET | `/bb-workspace/api/workspace/chats` | Member | Get active chats in workspace |
| POST | `/bb-workspace/api/workspace/chat/create` | Member | Create new chat in workspace |
| GET | `/bb-workspace/api/chat/allowed-models` | User | Get models allowed for a chat |

---

## Usage Examples

### Complete Workspace Setup Flow

```bash
# 1. Admin creates workspace
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=admin-session" \
  -d '{
    "name": "Engineering Team",
    "description": "Workspace for engineering"
  }'

# Response: { "success": true, "workspace": { "id": 1, ... } }

# 2. Admin assigns users
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/assign-users" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=admin-session" \
  -d '{
    "workspaceId": 1,
    "users": [
      { "user_id": 1, "role": "owner" },
      { "user_id": 2, "role": "admin" },
      { "user_id": 3, "role": "member" }
    ]
  }'

# 3. Admin assigns models
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/assign-models" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=admin-session" \
  -d '{
    "workspaceId": 1,
    "models": [
      { "model_id": 10 },
      { "model_id": 20 }
    ]
  }'

# 4. Member creates chat
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/chat/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=member-session" \
  -d '{
    "workspaceId": 1,
    "chatTitle": "Project Discussion",
    "modelId": 10
  }'

# 5. Get workspace chats
curl -X GET "http://localhost:8080/bb-workspace/api/workspace/chats?workspaceId=1" \
  -H "Cookie: login=member-session"
```

### User Perspective Flow

```bash
# 1. Get my workspaces
curl -X GET "http://localhost:8080/bb-workspace/api/my" \
  -H "Cookie: login=user-session"

# Response shows workspaces where user is a member

# 2. Get workspace details
curl -X GET "http://localhost:8080/bb-workspace/api/workspace/get?workspaceId=1" \
  -H "Cookie: login=user-session"

# 3. View workspace chats
curl -X GET "http://localhost:8080/bb-workspace/api/workspace/chats?workspaceId=1" \
  -H "Cookie: login=user-session"

# 4. Create new chat in workspace
curl -X POST "http://localhost:8080/bb-workspace/api/workspace/chat/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: login=user-session" \
  -d '{
    "workspaceId": 1,
    "chatTitle": "My New Chat",
    "modelId": 10
  }'
```

---

## Related Documentation

- **[README.md](./README.md)** - Component overview and architecture
- **[DATABASE.md](./DATABASE.md)** - Database schema and queries

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
