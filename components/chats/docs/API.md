# Chats API Documentation

Complete API reference for the Chats component.

## Base URL

All endpoints are prefixed with `/bb-chat/api/`

## Authentication

All endpoints require authentication via session cookies. The `authService.currentUser()` method is used to verify the authenticated user.

---

## Chat Endpoints

### Create Chat
**POST** `/chat/create`

Creates a new chat session.

**Request Body:**
```json
{
  "title": "My New Chat",
  "modelId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "chatId": 123,
  "sessionId": "abc123xyz",
  "message": "Chat created successfully"
}
```

---

### Get Chat by ID
**GET** `/chat/:chatId`

Retrieves a complete chat with all messages, thinking sections, and attachments.

**URL Parameters:**
- `chatId` - The chat ID

**Response:**
```json
{
  "success": true,
  "chat": {
    "id": 123,
    "title": "My Chat",
    "is_workspace_created": false,
    "session_id": "abc123",
    "total_token_count": 1500,
    "created_at": 1699999999000,
    "updated_at": 1699999999999,
    "messages": [
      {
        "id": 1,
        "role": "user",
        "content": "Hello",
        "token_count": 2,
        "model_id": 1,
        "createdAt": 1699999999000,
        "meta": {},
        "attachments": [],
        "thinkingSections": []
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "Hi there!",
        "token_count": 4,
        "tokens_per_seconds": 25,
        "generation_time_ms": 1200,
        "model_id": 1,
        "createdAt": 1699999999100,
        "meta": {
          "model": "gpt-4",
          "modelId": "1"
        },
        "attachments": [],
        "thinkingSections": [
          {
            "id": 1,
            "messageId": 2,
            "sectionId": "think_001",
            "content": "Let me think about this...",
            "startTime": 1699999999050,
            "endTime": 1699999999080,
            "duration": 30,
            "durationSeconds": 1,
            "thinkingTokensUsed": 50
          }
        ]
      }
    ],
    "totalThinkingSections": 1
  }
}
```

---

### Edit Chat Title
**PUT** `/chat/edit`

Updates the title of a chat.

**Request Body:**
```json
{
  "chatId": 123,
  "title": "Updated Chat Title"
}
```

**Response:**
```json
{
  "success": true,
  "chat": {
    "id": 123,
    "title": "Updated Chat Title"
  }
}
```

---

### Get Recent Chats
**GET** `/chat/recent`

Returns chats updated within the last 24 hours (max 20).

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "id": 123,
      "title": "My Chat",
      "timestamp": "2h ago",
      "description": "Hello, how are you?",
      "updated_at": 1699999999999,
      "created_at": 1699999999000,
      "session_id": "abc123",
      "total_token_count": 1500
    }
  ],
  "totalChats": 5,
  "period": "recent"
}
```

---

### Get All Chats
**GET** `/chat/all?page=1&limit=50`

Returns all chats for the current user (paginated, excludes admin-created chats).

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "chats": [...],
  "totalChats": 100,
  "page": 1,
  "limit": 50,
  "period": "all"
}
```

---

### Get Admin-Created Chats
**GET** `/chat/admin-created`

Returns chats created by admins that the user has access to (top 50).

**Response:**
```json
{
  "success": true,
  "chats": [...],
  "totalChats": 10
}
```

---

### Get Favorite Chats
**GET** `/chat/favorites`

Returns chats marked as favorites by the user.

**Response:**
```json
{
  "success": true,
  "chats": [...],
  "totalChats": 5
}
```

---

### Search Chats
**GET** `/chat/search?q=keyword&limit=20`

Searches chats by title and first message content.

**Query Parameters:**
- `q` - Search query (minimum 2 characters)
- `limit` - Max results (default: 20)

**Response:**
```json
{
  "success": true,
  "query": "keyword",
  "results": [...],
  "groupedResults": {
    "recent": [...],
    "thisWeek": [...],
    "thisMonth": [...],
    "older": [...]
  },
  "totalResults": 15
}
```

---

### Archive Chat
**PATCH** `/chat/:chatId/archive`

Archives a chat (soft archive).

**URL Parameters:**
- `chatId` - The chat ID

**Response:**
```json
{
  "success": true,
  "message": "Chat archived successfully"
}
```

---

### Delete Chat
**DELETE** `/chat/:chatId`
**DELETE** `/chat/:chatId/delete`

Deletes a chat (soft delete).

**URL Parameters:**
- `chatId` - The chat ID

**Response:**
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

---

## Message Endpoints

### Create User Message
**POST** `/message/createuser`

Creates a new user message in a chat.

**Request Body:**
```json
{
  "chatId": 123,
  "content": "Hello, AI!",
  "modelId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": 456,
  "chatId": 123
}
```

**Note:** After creating a user message, use WebSocket to start AI response streaming.

---

### Get Context Size
**POST** `/message/getContextSize`

Calculates the token count for a given chat's context.

**Request Body:**
```json
{
  "chatId": 123,
  "modelId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "contextSize": 1500,
  "messageCount": 10
}
```

---

## Favorites Endpoints

### Toggle Favorite
**POST** `/favorites/toggle`

Toggles the favorite status of a chat.

**Request Body:**
```json
{
  "chatId": 123
}
```

**Response:**
```json
{
  "success": true,
  "isFavorite": true
}
```

---

### Get Favorite Status
**GET** `/favorites/status?chatId=123`

Checks if a chat is favorited.

**Query Parameters:**
- `chatId` - The chat ID

**Response:**
```json
{
  "success": true,
  "isFavorite": true
}
```

---

### List Favorites
**GET** `/favorites/list`

Returns all favorited chats for the current user.

**Response:**
```json
{
  "success": true,
  "favorites": [
    {
      "chatId": 123,
      "title": "My Favorite Chat",
      "created_at": 1699999999000
    }
  ]
}
```

---

## Thinking Endpoints

### Create Thinking Section
**POST** `/thinking/create`

Creates a thinking section for a message (used by streaming service).

**Request Body:**
```json
{
  "messageId": 456,
  "sectionId": "think_001",
  "content": "Let me think about this...",
  "startTime": 1699999999050,
  "endTime": 1699999999080,
  "thinkingTokensUsed": 50
}
```

**Response:**
```json
{
  "success": true,
  "thinkingId": 789
}
```

---

### Get Thinking Sections
**GET** `/thinking/get/:messageId`

Retrieves all thinking sections for a message.

**URL Parameters:**
- `messageId` - The message ID

**Response:**
```json
{
  "success": true,
  "thinkingSections": [
    {
      "id": 789,
      "messageId": 456,
      "sectionId": "think_001",
      "content": "Let me think...",
      "startTime": 1699999999050,
      "endTime": 1699999999080,
      "thinkingTokensUsed": 50
    }
  ]
}
```

---

### Get Thinking Sections for Chat
**GET** `/thinking/chat/:chatId`

Retrieves all thinking sections for all messages in a chat.

**URL Parameters:**
- `chatId` - The chat ID

**Response:**
```json
{
  "success": true,
  "thinkingSections": [...],
  "totalSections": 5
}
```

---

## TPS (Tokens Per Second) Endpoints

### Update TPS
**POST** `/tps/update`

Updates TPS metrics for a message during streaming.

**Request Body:**
```json
{
  "messageId": 456,
  "tokenCount": 100,
  "elapsedMs": 4000
}
```

**Response:**
```json
{
  "success": true,
  "tps": 25
}
```

---

### Get Chat TPS Stats
**GET** `/tps/chat/:chatId`

Returns TPS statistics for a chat.

**URL Parameters:**
- `chatId` - The chat ID

**Response:**
```json
{
  "success": true,
  "averageTPS": 23.5,
  "maxTPS": 35,
  "minTPS": 15,
  "totalMessages": 10
}
```

---

### Get User TPS Stats
**GET** `/tps/user/:userId`

Returns TPS statistics for a user.

**URL Parameters:**
- `userId` - The user ID

**Response:**
```json
{
  "success": true,
  "averageTPS": 24.8,
  "maxTPS": 40,
  "minTPS": 12,
  "totalMessages": 150
}
```

---

## Token Analytics Endpoints

### Get Analytics
**GET** `/token-analytics?period=daily&userId=1`

Returns token usage analytics.

**Query Parameters:**
- `period` - Time period (daily, weekly, monthly)
- `userId` - Optional user filter

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalTokens": 50000,
    "periodStart": 1699900000000,
    "periodEnd": 1699999999999,
    "breakdown": [
      {
        "date": "2024-01-01",
        "tokens": 5000
      }
    ]
  }
}
```

---

### Get User Analytics
**GET** `/token-analytics/user/:userId?period=weekly`

Returns token analytics for a specific user.

**URL Parameters:**
- `userId` - The user ID

**Query Parameters:**
- `period` - Time period (daily, weekly, monthly)

**Response:**
```json
{
  "success": true,
  "userId": 1,
  "analytics": {
    "totalTokens": 10000,
    "averagePerDay": 1428,
    "topChats": [
      {
        "chatId": 123,
        "title": "My Chat",
        "tokens": 5000
      }
    ]
  }
}
```

---

## Chat Settings Endpoints

### Get Settings
**GET** `/chat/settings`

Returns chat settings for the current user.

**Response:**
```json
{
  "success": true,
  "settings": {
    "defaultModel": "gpt-4",
    "streamingEnabled": true,
    "showThinking": true
  }
}
```

---

### Update Settings
**POST** `/chat/settings`

Updates chat settings for the current user.

**Request Body:**
```json
{
  "defaultModel": "gpt-4",
  "streamingEnabled": true,
  "showThinking": false
}
```

**Response:**
```json
{
  "success": true,
  "settings": {...}
}
```

---

## Admin Endpoints

### Admin Search Chats
**GET** `/admin/chat/search?q=keyword&userId=1&limit=50`

Admin-only endpoint to search all chats across all users.

**Query Parameters:**
- `q` - Search query
- `userId` - Optional user filter
- `limit` - Max results (default: 50)

**Response:**
```json
{
  "success": true,
  "results": [...],
  "totalResults": 25
}
```

---

### Admin Get Chat
**GET** `/admin/chat/:chatId`

Admin-only endpoint to view any chat.

**URL Parameters:**
- `chatId` - The chat ID

**Response:**
```json
{
  "success": true,
  "chat": {...}
}
```

---

### Admin Delete Chat
**DELETE** `/admin/chat/:chatId`

Admin-only endpoint to permanently delete a chat.

**URL Parameters:**
- `chatId` - The chat ID

**Response:**
```json
{
  "success": true,
  "message": "Chat permanently deleted"
}
```

---

### Admin Create Chat
**POST** `/admin/chat/create`

Admin-only endpoint to create a chat for any user.

**Request Body:**
```json
{
  "userId": 1,
  "title": "Admin Created Chat",
  "modelId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "chatId": 123,
  "message": "Chat created for user"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (no permission)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Rate Limiting

Currently, no rate limiting is enforced. Consider implementing rate limiting for production deployments.

---

## Pagination

Endpoints that return lists support pagination via `page` and `limit` query parameters:
- Default `page`: 1
- Default `limit`: 50
- Maximum `limit`: 100

---

## Filtering

Some endpoints support filtering via query parameters. Check individual endpoint documentation for supported filters.

---

## Sorting

List endpoints return results sorted by `updated_at` in descending order (newest first) unless otherwise specified.
