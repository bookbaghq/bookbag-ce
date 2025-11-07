# API Documentation

Complete REST API reference for BookBag.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Users](#users)
- [Chats](#chats)
- [Messages](#messages)
- [Models](#models)
- [RAG Documents](#rag-documents)
- [Workspaces](#workspaces)
- [Media](#media)
- [Admin](#admin)
- [Error Handling](#error-handling)

## Overview

### Base URL

```
Development: http://localhost:8080
Production: https://your-domain.com
```

### Authentication

Most endpoints require authentication via JWT token in cookies. The token is automatically included when using `credentials: 'include'` in fetch requests.

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

Or on error:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Authentication

### Login

Authenticate user and receive JWT tokens.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "subscriber"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Register

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "subscriber"
  }
}
```

### Logout

Logout current user.

**Endpoint:** `POST /api/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Refresh Token

Refresh access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Users

### Get Current User

Get authenticated user's profile.

**Endpoint:** `GET /api/user/profile`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "subscriber",
    "created_at": "1640000000000",
    "updated_at": "1640000000000"
  }
}
```

### Update Profile

Update user profile information.

**Endpoint:** `PUT /api/user/profile`

**Auth Required:** Yes

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

### Change Password

Change user password.

**Endpoint:** `POST /api/user/credentials/change-password`

**Auth Required:** Yes

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### List Users (Admin)

List all users in the system.

**Endpoint:** `GET /api/users`

**Auth Required:** Yes (Admin only)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "subscriber",
      "is_active": 1,
      "created_at": "1640000000000"
    }
  ]
}
```

## Chats

### List Chats

Get all chats for current user.

**Endpoint:** `GET /api/chats`

**Auth Required:** Yes

**Query Parameters:**
- `workspace_id` (optional): Filter by workspace
- `is_archived` (optional): Filter archived chats
- `is_favorite` (optional): Filter favorite chats

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "id": 1,
      "user_id": 1,
      "workspace_id": null,
      "title": "My Chat",
      "is_archived": 0,
      "is_favorite": 0,
      "created_at": "1640000000000",
      "updated_at": "1640000000000"
    }
  ]
}
```

### Get Chat

Get a single chat by ID.

**Endpoint:** `GET /api/chats/:id`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "chat": {
    "id": 1,
    "user_id": 1,
    "workspace_id": null,
    "title": "My Chat",
    "is_archived": 0,
    "is_favorite": 0,
    "created_at": "1640000000000",
    "updated_at": "1640000000000",
    "messages": [
      {
        "id": 1,
        "role": "user",
        "content": "Hello",
        "created_at": "1640000000000"
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "Hi! How can I help you?",
        "model_id": 1,
        "input_tokens": 10,
        "output_tokens": 15,
        "created_at": "1640000001000"
      }
    ]
  }
}
```

### Create Chat

Create a new chat.

**Endpoint:** `POST /api/chats`

**Auth Required:** Yes

**Request Body:**
```json
{
  "title": "New Chat",
  "workspace_id": 1 // optional
}
```

**Response:**
```json
{
  "success": true,
  "chat": {
    "id": 1,
    "user_id": 1,
    "workspace_id": 1,
    "title": "New Chat",
    "is_archived": 0,
    "is_favorite": 0,
    "created_at": "1640000000000"
  }
}
```

### Update Chat

Update chat properties.

**Endpoint:** `PUT /api/chats/:id`

**Auth Required:** Yes

**Request Body:**
```json
{
  "title": "Updated Title",
  "is_archived": 1,
  "is_favorite": 1
}
```

**Response:**
```json
{
  "success": true,
  "chat": { /* updated chat object */ }
}
```

### Delete Chat

Delete a chat (soft delete).

**Endpoint:** `DELETE /api/chats/:id`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

### Get Chat Analytics

Get token usage analytics for a chat.

**Endpoint:** `GET /api/chats/:id/analytics`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "analytics": {
    "total_messages": 10,
    "total_input_tokens": 1000,
    "total_output_tokens": 1500,
    "total_tokens": 2500,
    "average_tokens_per_message": 250
  }
}
```

## Messages

### Send Message (WebSocket)

Messages are sent via WebSocket, not REST API.

**Event:** `sendMessage`

**Data:**
```json
{
  "chatId": 1,
  "modelId": 1,
  "message": "Hello, how are you?",
  "workspaceId": null // optional
}
```

**Server Events:**
- `messageChunk`: Streamed response chunks
- `messageComplete`: Final message saved
- `error`: Error occurred

### Get Messages

Get messages for a chat.

**Endpoint:** `GET /api/chats/:chatId/messages`

**Auth Required:** Yes

**Query Parameters:**
- `limit` (optional): Number of messages (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "chat_id": 1,
      "model_id": 1,
      "role": "user",
      "content": "Hello",
      "thinking": null,
      "input_tokens": 0,
      "output_tokens": 0,
      "created_at": "1640000000000"
    },
    {
      "id": 2,
      "chat_id": 1,
      "model_id": 1,
      "role": "assistant",
      "content": "Hi! How can I help?",
      "thinking": null,
      "input_tokens": 10,
      "output_tokens": 15,
      "created_at": "1640000001000"
    }
  ],
  "total": 2
}
```

## Models

### List Models

Get all available models.

**Endpoint:** `GET /api/models`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "id": 1,
      "name": "GPT-4",
      "provider": "openai",
      "model_string": "gpt-4",
      "is_published": 1,
      "supports_vision": 1,
      "supports_generation": 0,
      "max_tokens": 8192,
      "created_at": "1640000000000"
    }
  ]
}
```

### Get Model

Get a single model by ID.

**Endpoint:** `GET /api/models/:id`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "model": {
    "id": 1,
    "name": "GPT-4",
    "provider": "openai",
    "model_string": "gpt-4",
    "system_prompt": "You are a helpful assistant.",
    "is_published": 1,
    "supports_vision": 1,
    "supports_generation": 0,
    "max_tokens": 8192,
    "temperature": 0.7,
    "profile_id": 1,
    "created_at": "1640000000000"
  }
}
```

### Create Model (Admin)

Create a new model.

**Endpoint:** `POST /api/models`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "name": "GPT-4",
  "provider": "openai",
  "model_string": "gpt-4",
  "system_prompt": "You are a helpful assistant.",
  "is_published": 1,
  "supports_vision": 1,
  "supports_generation": 0,
  "max_tokens": 8192,
  "temperature": 0.7,
  "profile_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "model": { /* created model object */ }
}
```

### Update Model (Admin)

Update model configuration.

**Endpoint:** `PUT /api/models/:id`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "name": "GPT-4 Updated",
  "system_prompt": "New system prompt",
  "temperature": 0.8
}
```

**Response:**
```json
{
  "success": true,
  "model": { /* updated model object */ }
}
```

### Delete Model (Admin)

Delete a model.

**Endpoint:** `DELETE /api/models/:id`

**Auth Required:** Yes (Admin only)

**Response:**
```json
{
  "success": true,
  "message": "Model deleted successfully"
}
```

### Get Model Settings (Admin)

Get API keys and provider settings.

**Endpoint:** `GET /api/models/settings`

**Auth Required:** Yes (Admin only)

**Response:**
```json
{
  "success": true,
  "settings": {
    "openai_api_key": "sk-...",
    "anthropic_api_key": "sk-ant-...",
    "grok_api_key": "xai-..."
  }
}
```

### Update Model Settings (Admin)

Update API keys and provider settings.

**Endpoint:** `PUT /api/models/settings`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "openai_api_key": "sk-new-key...",
  "anthropic_api_key": "sk-ant-new-key..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

## RAG Documents

### List Documents

Get all documents for current user.

**Endpoint:** `GET /api/rag/documents`

**Auth Required:** Yes

**Query Parameters:**
- `workspace_id` (optional): Filter by workspace
- `chat_id` (optional): Filter by chat

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "id": 1,
      "user_id": 1,
      "workspace_id": null,
      "chat_id": 1,
      "filename": "document.pdf",
      "mimetype": "application/pdf",
      "size": 102400,
      "status": "completed",
      "chunk_count": 10,
      "created_at": "1640000000000"
    }
  ]
}
```

### Upload Document

Upload a document for RAG processing.

**Endpoint:** `POST /api/rag/documents/upload`

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Document file (PDF, DOCX, TXT, CSV)
- `workspace_id` (optional): Associate with workspace
- `chat_id` (optional): Associate with chat

**Response:**
```json
{
  "success": true,
  "document": {
    "id": 1,
    "filename": "document.pdf",
    "status": "processing",
    "created_at": "1640000000000"
  }
}
```

### Get Document

Get document details including chunks.

**Endpoint:** `GET /api/rag/documents/:id`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "document": {
    "id": 1,
    "filename": "document.pdf",
    "status": "completed",
    "chunk_count": 10,
    "created_at": "1640000000000",
    "chunks": [
      {
        "id": 1,
        "content": "Chunk text...",
        "page_number": 1,
        "created_at": "1640000000000"
      }
    ]
  }
}
```

### Delete Document

Delete a document and all its chunks.

**Endpoint:** `DELETE /api/rag/documents/:id`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### Get RAG Settings (Admin)

Get RAG system settings.

**Endpoint:** `GET /api/rag/settings`

**Auth Required:** Yes (Admin only)

**Response:**
```json
{
  "success": true,
  "settings": {
    "is_rag_active": true,
    "grounding_mode": "soft",
    "chunk_size": 1000,
    "chunk_overlap": 200,
    "top_k_results": 5
  }
}
```

### Update RAG Settings (Admin)

Update RAG system settings.

**Endpoint:** `PUT /api/rag/settings`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "is_rag_active": true,
  "grounding_mode": "strict",
  "chunk_size": 1500,
  "top_k_results": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

## Workspaces

### List Workspaces

Get all workspaces for current user.

**Endpoint:** `GET /api/workspaces`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "workspaces": [
    {
      "id": 1,
      "name": "My Team",
      "description": "Team workspace",
      "created_at": "1640000000000",
      "updated_at": "1640000000000",
      "role": "admin"
    }
  ]
}
```

### Get Workspace

Get workspace details including members and models.

**Endpoint:** `GET /api/workspaces/:id`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "workspace": {
    "id": 1,
    "name": "My Team",
    "description": "Team workspace",
    "created_at": "1640000000000",
    "members": [
      {
        "id": 1,
        "user_id": 1,
        "role": "admin",
        "user": {
          "id": 1,
          "email": "user@example.com",
          "first_name": "John",
          "last_name": "Doe"
        }
      }
    ],
    "models": [
      {
        "id": 1,
        "model_id": 1,
        "model": {
          "id": 1,
          "name": "GPT-4",
          "provider": "openai"
        }
      }
    ]
  }
}
```

### Create Workspace

Create a new workspace.

**Endpoint:** `POST /api/workspaces`

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "New Workspace",
  "description": "Workspace description"
}
```

**Response:**
```json
{
  "success": true,
  "workspace": {
    "id": 1,
    "name": "New Workspace",
    "description": "Workspace description",
    "created_at": "1640000000000"
  }
}
```

### Update Workspace

Update workspace details.

**Endpoint:** `PUT /api/workspaces/:id`

**Auth Required:** Yes (Workspace Admin)

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "workspace": { /* updated workspace */ }
}
```

### Delete Workspace

Delete a workspace.

**Endpoint:** `DELETE /api/workspaces/:id`

**Auth Required:** Yes (Workspace Admin)

**Response:**
```json
{
  "success": true,
  "message": "Workspace deleted successfully"
}
```

### Add Member to Workspace

Add a user to workspace.

**Endpoint:** `POST /api/workspaces/:id/members`

**Auth Required:** Yes (Workspace Admin)

**Request Body:**
```json
{
  "user_id": 2,
  "role": "member"
}
```

**Response:**
```json
{
  "success": true,
  "member": {
    "id": 1,
    "workspace_id": 1,
    "user_id": 2,
    "role": "member"
  }
}
```

### Remove Member from Workspace

Remove a user from workspace.

**Endpoint:** `DELETE /api/workspaces/:id/members/:userId`

**Auth Required:** Yes (Workspace Admin)

**Response:**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

### Assign Model to Workspace

Assign a model to workspace.

**Endpoint:** `POST /api/workspaces/:id/models`

**Auth Required:** Yes (Workspace Admin)

**Request Body:**
```json
{
  "model_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "model": {
    "id": 1,
    "workspace_id": 1,
    "model_id": 1
  }
}
```

### Remove Model from Workspace

Remove model assignment from workspace.

**Endpoint:** `DELETE /api/workspaces/:id/models/:modelId`

**Auth Required:** Yes (Workspace Admin)

**Response:**
```json
{
  "success": true,
  "message": "Model removed successfully"
}
```

## Media

### Upload Media

Upload an image or media file.

**Endpoint:** `POST /api/media/upload`

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Image file (JPG, PNG, WebP, etc.)
- `chat_id` (optional): Associate with chat

**Response:**
```json
{
  "success": true,
  "media": {
    "id": 1,
    "filename": "image.jpg",
    "filepath": "/media/user-1/image.jpg",
    "mimetype": "image/jpeg",
    "size": 51200,
    "created_at": "1640000000000"
  }
}
```

### List Media

Get all media for current user.

**Endpoint:** `GET /api/media`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "media": [
    {
      "id": 1,
      "filename": "image.jpg",
      "filepath": "/media/user-1/image.jpg",
      "mimetype": "image/jpeg",
      "size": 51200,
      "created_at": "1640000000000"
    }
  ]
}
```

### Get Media

Get media file details.

**Endpoint:** `GET /api/media/:id`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "media": {
    "id": 1,
    "filename": "image.jpg",
    "filepath": "/media/user-1/image.jpg",
    "mimetype": "image/jpeg",
    "size": 51200,
    "created_at": "1640000000000",
    "url": "http://localhost:8080/media/user-1/image.jpg"
  }
}
```

### Delete Media

Delete a media file.

**Endpoint:** `DELETE /api/media/:id`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

## Admin

### Get System Settings

Get system-wide settings.

**Endpoint:** `GET /api/admin/settings`

**Auth Required:** Yes (Admin only)

**Response:**
```json
{
  "success": true,
  "settings": {
    "is_rag_active": true,
    "is_mail_active": true,
    "is_user_active": true,
    "is_workspace_active": true,
    "is_media_active": true
  }
}
```

### Update System Settings

Update system-wide settings.

**Endpoint:** `PUT /api/admin/settings`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "is_rag_active": true,
  "is_mail_active": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### Get Token Analytics

Get system-wide token usage analytics.

**Endpoint:** `GET /api/analytics/tokens`

**Auth Required:** Yes (Admin only)

**Query Parameters:**
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "analytics": {
    "total_tokens": 1000000,
    "total_input_tokens": 400000,
    "total_output_tokens": 600000,
    "total_chats": 500,
    "average_tokens_per_chat": 2000,
    "top_users": [
      {
        "user_id": 1,
        "email": "user@example.com",
        "total_tokens": 50000
      }
    ],
    "top_models": [
      {
        "model_id": 1,
        "name": "GPT-4",
        "total_tokens": 300000
      }
    ]
  }
}
```

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": { /* optional additional details */ }
}
```

### Common Error Messages

**Authentication Errors:**
- `"Authentication required"` - No token provided
- `"Invalid token"` - Token is invalid or expired
- `"Invalid credentials"` - Login failed

**Authorization Errors:**
- `"Insufficient permissions"` - User lacks required permissions
- `"Access denied"` - Resource not accessible

**Validation Errors:**
- `"Required field missing"` - Required field not provided
- `"Invalid format"` - Data format invalid
- `"Value out of range"` - Value exceeds limits

**Resource Errors:**
- `"Resource not found"` - Requested resource doesn't exist
- `"Resource already exists"` - Duplicate resource
- `"Cannot delete resource"` - Resource in use

## Rate Limiting

Rate limiting is not currently enforced but may be added in future versions.

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit`: Number of items (default: 50, max: 100)
- `offset`: Skip items (default: 0)

**Response includes total:**
```json
{
  "success": true,
  "items": [/* items */],
  "total": 250,
  "limit": 50,
  "offset": 0
}
```

## WebSocket Events

### Connection

Connect to WebSocket:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8080', {
  withCredentials: true
});
```

### Chat Events

**Client → Server:**
- `sendMessage`: Send a chat message
- `joinChat`: Join a chat room
- `leaveChat`: Leave a chat room

**Server → Client:**
- `messageChunk`: Streamed response chunk
- `messageComplete`: Message fully generated
- `error`: Error occurred
- `thinking`: Thinking section content

### Example

```javascript
// Send message
socket.emit('sendMessage', {
  chatId: 1,
  modelId: 1,
  message: 'Hello!',
  workspaceId: null
});

// Receive chunks
socket.on('messageChunk', (data) => {
  console.log('Chunk:', data.content);
});

// Receive complete message
socket.on('messageComplete', (data) => {
  console.log('Complete message:', data);
});

// Handle errors
socket.on('error', (error) => {
  console.error('Error:', error);
});
```

## SDK Examples

### JavaScript/TypeScript

```javascript
class BookBagAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return await response.json();
  }

  async login(email, password) {
    return await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async getChats() {
    return await this.request('/api/chats');
  }

  async createChat(title, workspaceId = null) {
    return await this.request('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ title, workspace_id: workspaceId })
    });
  }

  // ... other methods
}

// Usage
const api = new BookBagAPI('http://localhost:8080');
await api.login('user@example.com', 'password');
const chats = await api.getChats();
```

## Versioning

Current API version: **v1** (implicit in URLs)

Future versions will be explicitly versioned: `/api/v2/...`

## Support

For API questions or issues:
- Check [Troubleshooting Guide](../TROUBLESHOOTING.md)
- Open [GitHub Issue](https://github.com/bookbaghq/bookbag-ce/issues)
- Join [GitHub Discussions](https://github.com/bookbaghq/bookbag-ce/discussions)

## Related Documentation

- [Developer Guide](../DEVELOPER_GUIDE.md) - Development practices
- [Architecture](../ARCHITECTURE.md) - System architecture
- [User Guide](../USER_GUIDE.md) - User documentation
