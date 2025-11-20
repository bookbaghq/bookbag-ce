# API Reference

Complete API endpoint documentation for the Bookbag API Component.

---

## Base URLs

- **Admin API:** `http://localhost:8080/bb-api/api`
- **External API:** `http://localhost:8080/bb-api/external/:api_key`

---

## External API Endpoints

### POST `/bb-api/external/:api_key/chat`

Send a message to the LLM and get a response.

**Path Parameters:**
- `api_key` (string, required) - Your API key

**Request Body:**
```json
{
  "message": "Your message here",
  "session_id": "optional_session_id"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "session_id": "session_abc123",
  "response": "LLM response text",
  "model": "gpt-4",
  "tokens": {
    "prompt": 12,
    "completion": 18,
    "total": 30
  },
  "usage": {
    "requests_remaining": 99,
    "window_reset_at": "2024-11-12T12:30:00Z"
  },
  "processingTime": 1234
}
```

**Error Responses:**
- `400` - Missing message or validation error
- `401` - Invalid API key
- `403` - Inactive API key
- `429` - Rate limit exceeded
- `500` - Server error

---

## Admin API Endpoints

### API Key Management

#### GET `/bb-api/api/list`

List all API keys.

**Response (200 OK):**
```json
{
  "success": true,
  "apis": [
    {
      "id": 1,
      "name": "My Application",
      "api_key": "bb_abc...",
      "model_name": "gpt-4",
      "is_active": true,
      "rate_limit_requests": 100,
      "rate_limit_window": 60,
      "total_requests": 42,
      "created_at": "2024-11-12T10:00:00Z"
    }
  ]
}
```

---

#### GET `/bb-api/api/:id`

Get single API key details.

**Path Parameters:**
- `id` (integer, required) - API key ID

**Response (200 OK):**
```json
{
  "success": true,
  "api": {
    "id": 1,
    "name": "My Application",
    "api_key": "bb_abc...",
    "description": "API key for my app",
    "model_id": 1,
    "model_name": "gpt-4",
    "is_active": true,
    "rate_limit_requests": 100,
    "rate_limit_window": 60,
    "session_limit": null,
    "max_messages_per_session": 50,
    "total_requests": 42,
    "created_at": "2024-11-12T10:00:00Z",
    "updated_at": "2024-11-12T10:30:00Z"
  }
}
```

---

#### POST `/bb-api/api`

Create a new API key.

**Request Body:**
```json
{
  "name": "My Application",
  "description": "API key for my app",
  "model_id": 1,
  "model_name": "gpt-4",
  "rate_limit_requests": 100,
  "rate_limit_window": 60,
  "session_limit": null,
  "max_messages_per_session": 50
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "api_key": "bb_1234567890abcdef1234567890abcdef",
    "name": "My Application",
    "is_active": true,
    "created_at": "2024-11-12T10:00:00Z"
  }
}
```

⚠️ **Important:** The full `api_key` is only returned once during creation!

---

#### PUT `/bb-api/api/:id`

Update an existing API key.

**Path Parameters:**
- `id` (integer, required) - API key ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "model_id": 2,
  "model_name": "gpt-4-turbo",
  "rate_limit_requests": 200,
  "rate_limit_window": 60,
  "session_limit": 10,
  "max_messages_per_session": 100
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "api": {
    "id": 1,
    "name": "Updated Name",
    ...
  }
}
```

---

#### DELETE `/bb-api/api/:id`

Delete an API key (permanent).

**Path Parameters:**
- `id` (integer, required) - API key ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

---

#### POST `/bb-api/api/:id/toggle`

Toggle API key active status (activate/deactivate).

**Path Parameters:**
- `id` (integer, required) - API key ID

**Response (200 OK):**
```json
{
  "success": true,
  "api": {
    "id": 1,
    "is_active": false
  }
}
```

---

#### POST `/bb-api/api/:id/regenerate`

Regenerate API key (creates new key, invalidates old one).

**Path Parameters:**
- `id` (integer, required) - API key ID

**Response (200 OK):**
```json
{
  "success": true,
  "api": {
    "id": 1,
    "api_key": "bb_newkey1234567890abcdef",
    "name": "My Application"
  }
}
```

⚠️ **Important:** Save the new `api_key` immediately - the old key is now invalid!

---

### Session Management

#### GET `/bb-api/api/sessions/list`

List all active sessions across all API keys.

**Response (200 OK):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": 1,
      "api_id": 1,
      "api_name": "My Application",
      "session_id": "session_abc123",
      "is_active": true,
      "message_count": 10,
      "total_tokens_used": 500,
      "created_at": "2024-11-12T10:00:00Z",
      "last_activity_at": "2024-11-12T10:15:00Z"
    }
  ]
}
```

---

#### GET `/bb-api/api/sessions/:id`

Get single session details.

**Path Parameters:**
- `id` (integer, required) - Session database ID

**Response (200 OK):**
```json
{
  "success": true,
  "session": {
    "id": 1,
    "api_id": 1,
    "session_id": "session_abc123",
    "is_active": true,
    "message_count": 10,
    "total_tokens_used": 500,
    "created_at": "2024-11-12T10:00:00Z",
    "last_activity_at": "2024-11-12T10:15:00Z"
  }
}
```

---

#### DELETE `/bb-api/api/sessions/:id`

Delete a session (removes session and its messages).

**Path Parameters:**
- `id` (integer, required) - Session database ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

#### POST `/bb-api/api/sessions/:apiId/clear`

Clear all sessions for a specific API key.

**Path Parameters:**
- `apiId` (integer, required) - API key ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All sessions cleared for API key",
  "deleted_count": 5
}
```

---

### Settings Management

#### GET `/bb-api/api/settings`

Get global API settings.

**Response (200 OK):**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "global_rate_limit_enabled": true,
    "global_rate_limit_requests": 1000,
    "global_rate_limit_window": 3600,
    "default_session_limit": null,
    "default_max_messages_per_session": 100,
    "session_expiration_hours": 24,
    "api_key_prefix": "bb_",
    "api_key_length": 32,
    "log_requests": true,
    "log_responses": false,
    "require_https": false,
    "allowed_origins": null,
    "created_at": "2024-11-12T00:00:00Z",
    "updated_at": "2024-11-12T10:00:00Z"
  }
}
```

---

#### POST `/bb-api/api/settings`

Update global API settings.

**Request Body:**
```json
{
  "global_rate_limit_enabled": true,
  "global_rate_limit_requests": 2000,
  "global_rate_limit_window": 3600,
  "default_session_limit": 10,
  "default_max_messages_per_session": 150,
  "session_expiration_hours": 48,
  "api_key_prefix": "bb_",
  "api_key_length": 32,
  "log_requests": true,
  "log_responses": true,
  "require_https": true,
  "allowed_origins": "https://example.com, https://app.example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "settings": {
    ...updated settings
  }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key not found or format invalid |
| `INACTIVE_API_KEY` | 403 | API key exists but is deactivated |
| `RATE_LIMIT_EXCEEDED` | 429 | Per-key rate limit exceeded |
| `GLOBAL_RATE_LIMIT_EXCEEDED` | 429 | Global rate limit exceeded |
| `SESSION_LIMIT_EXCEEDED` | 429 | Max concurrent sessions reached |
| `MESSAGE_LIMIT_EXCEEDED` | 400 | Too many messages in session |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `SERVER_ERROR` | 500 | Internal server error |
| `LLM_ERROR` | 500 | LLM service error |

---

## Rate Limiting Headers

When rate limits are active, responses include headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1699891200
```

- `X-RateLimit-Limit`: Maximum requests in window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Authentication

### External API
Include API key in URL path:
```
POST /bb-api/external/bb_YOUR_KEY_HERE/chat
```

### Admin API
Uses session-based authentication (cookies). Must be logged in to admin interface.

---

## Content Type

All requests must include:
```http
Content-Type: application/json
```

All responses return:
```http
Content-Type: application/json
```

---

## CORS

CORS is configurable in settings:
- `allowed_origins`: Comma-separated list of allowed origins
- Empty/null: Allows all origins
- Specific domains: Only listed domains allowed

---

## Examples

See [Integration Guide](./INTEGRATION_GUIDE.md) for complete code examples in:
- Node.js
- Python
- PHP
- cURL
- JavaScript (Browser)

---

**Last Updated:** November 12, 2024
