# Bookbag API Component Documentation

> **Version:** 1.0.0
> **Last Updated:** November 12, 2024
> **Component:** `components/api`

---

## Overview

The Bookbag API Component provides a complete REST API system for external applications to interact with Bookbag's LLM capabilities. It includes API key management, session handling, rate limiting, and comprehensive administrative controls.

---

## Features

- **API Key Management** - Create, manage, and revoke API keys
- **Session Management** - Track and manage conversation sessions
- **Rate Limiting** - Global and per-key rate limits
- **LLM Integration** - Full hook integration with Bookbag's LLM system
- **Admin Interface** - Complete Next.js admin UI for management
- **Security** - API key authentication, HTTPS enforcement, CORS support
- **Analytics** - Token usage tracking and session statistics

---

## Quick Start

### Creating an API Key

```bash
curl -X POST http://localhost:8080/bb-api/api \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Application",
    "description": "API key for my app",
    "model_id": 1,
    "model_name": "gpt-4",
    "rate_limit_requests": 100,
    "rate_limit_window": 60,
    "max_messages_per_session": 50
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "api_key": "bb_1234567890abcdef1234567890abcdef",
    "name": "My Application",
    "is_active": true
  }
}
```

⚠️ **Important:** Save the `api_key` - it's only shown once!

### Using the API

```bash
curl -X POST http://localhost:8080/bb-api/external/bb_YOUR_API_KEY/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "session_id": "optional_session_id"
  }'
```

**Response:**
```json
{
  "success": true,
  "session_id": "session_abc123",
  "response": "Hello! I'm doing well, thank you for asking. How can I help you today?",
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

---

## Documentation

### Core Documentation

- **[API Reference](./API_REFERENCE.md)** - Complete endpoint documentation
- **[Authentication Guide](./AUTHENTICATION.md)** - API key setup and usage
- **[Rate Limiting](./RATE_LIMITING.md)** - Rate limit configuration and handling
- **[Integration Guide](./INTEGRATION_GUIDE.md)** - External application integration
- **[Admin UI Guide](./ADMIN_UI_GUIDE.md)** - Using the admin interface

### Technical Documentation

- **[Architecture](./ARCHITECTURE.md)** - System design and components
- **[Database Schema](./DATABASE_SCHEMA.md)** - Tables and relationships
- **[Hook Integration](./HOOKS.md)** - LLM hook system integration
- **[Security](./SECURITY.md)** - Security features and best practices

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                External Application                      │
│                (Your App/Service)                        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP Request with API Key
                     │
┌────────────────────▼────────────────────────────────────┐
│              External API Controller                     │
│            /bb-api/external/:api_key/chat               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. Validate API Key                             │  │
│  │  2. Check Rate Limits                            │  │
│  │  3. Get/Create Session                           │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────┐
│                Message Service                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Hook: llm_before_generate                       │  │
│  │  Hook: llm_generate                              │  │
│  │  Hook: llm_after_generate                        │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────┐
│                  LLM Service                            │
│            (OpenAI, Claude, etc.)                       │
└─────────────────────────────────────────────────────────┘
```

---

## Component Structure

```
components/api/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       ├── apiController.js          # API key CRUD
│   │       ├── sessionController.js      # Session management
│   │       ├── settingsController.js     # Settings management
│   │       └── externalController.js     # External API endpoint
│   ├── models/
│   │   ├── Api.js                        # API key model
│   │   ├── ApiSession.js                 # Session model
│   │   ├── ApiSettings.js                # Settings model
│   │   └── db/migrations/                # Database migrations
│   └── service/
│       └── messageService.js             # LLM processing service
├── config/
│   ├── routes.js                         # API routes
│   └── environments/                     # Environment configs
└── docs/                                 # This documentation
```

---

## Admin UI Structure

```
nextjs-app/app/bb-admin/api/
├── page.js                               # API management index
├── keys/page.js                          # API keys list
├── create/page.js                        # Create API key form
├── sessions/page.js                      # Active sessions view
└── settings/page.js                      # Global settings

nextjs-app/services/
└── apiKeyService.js                      # Frontend API service
```

---

## Database Tables

### `apis`
Stores API keys and their configuration
- `id` - Primary key
- `api_key` - Unique API key (indexed)
- `name` - Display name
- `description` - Optional description
- `model_id` - Associated model ID
- `model_name` - Model name
- `is_active` - Active status
- `rate_limit_requests` - Request limit
- `rate_limit_window` - Time window (seconds)
- `session_limit` - Max concurrent sessions
- `max_messages_per_session` - Messages per session limit
- `total_requests` - Total request count
- Timestamps

### `api_sessions`
Tracks conversation sessions
- `id` - Primary key
- `api_id` - Foreign key to apis
- `session_id` - Unique session identifier (indexed)
- `is_active` - Active status
- `message_count` - Number of messages
- `total_tokens_used` - Total tokens consumed
- `last_activity_at` - Last activity timestamp
- Timestamps

### `api_settings`
Global API configuration
- `id` - Primary key (singleton)
- `global_rate_limit_enabled` - Global limit flag
- `global_rate_limit_requests` - Global request limit
- `global_rate_limit_window` - Global time window
- `default_session_limit` - Default session limit
- `default_max_messages_per_session` - Default message limit
- `session_expiration_hours` - Session expiration time
- `api_key_prefix` - API key prefix (default: "bb_")
- `api_key_length` - API key length (default: 32)
- `log_requests` - Log requests flag
- `log_responses` - Log responses flag
- `require_https` - HTTPS requirement flag
- `allowed_origins` - CORS allowed origins
- Timestamps

---

## Environment Variables

```bash
# API Configuration
API_KEY_PREFIX=bb_
API_KEY_LENGTH=32
API_GLOBAL_RATE_LIMIT=1000
API_GLOBAL_RATE_WINDOW=3600

# Security
API_REQUIRE_HTTPS=false
API_ALLOWED_ORIGINS=*

# Logging
API_LOG_REQUESTS=true
API_LOG_RESPONSES=false
```

---

## Key Concepts

### API Keys
- Unique identifiers for external applications
- Format: `{prefix}_{random_string}` (e.g., `bb_abc123...`)
- Configurable rate limits and model selection
- Can be activated/deactivated without deletion

### Sessions
- Conversation contexts identified by `session_id`
- Track message history and token usage
- Auto-generated if not provided
- Support session limits per API key

### Rate Limiting
- Per-API-key limits (e.g., 100 req/60s)
- Optional global limits across all keys
- Sliding window algorithm
- Returns `429 Too Many Requests` when exceeded

### Hooks Integration
- `llm_before_generate` - Pre-processing
- `llm_generate` - Main LLM call
- `llm_after_generate` - Post-processing
- Full access to message context

---

## Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key not found or invalid |
| `INACTIVE_API_KEY` | 403 | API key is deactivated |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `SESSION_LIMIT_EXCEEDED` | 429 | Session limit reached |
| `MESSAGE_LIMIT_EXCEEDED` | 400 | Too many messages in session |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Security Features

- **API Key Authentication** - Secure token-based auth
- **Rate Limiting** - Prevent abuse
- **HTTPS Enforcement** - Optional TLS requirement
- **CORS Support** - Configurable origins
- **Session Management** - Isolated conversations
- **Audit Logging** - Request/response logging
- **Key Regeneration** - Rotate compromised keys

---

## Performance Considerations

- **Caching** - API key validation cached
- **Database Indexing** - Optimized queries
- **Async Processing** - Non-blocking LLM calls
- **Connection Pooling** - Efficient DB connections
- **Rate Limit Efficiency** - In-memory tracking

---

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Migrations**
   ```bash
   master=development masterrecord update-database apiContext
   ```

3. **Start Server**
   ```bash
   node server.js
   ```

4. **Access Admin UI**
   Navigate to `http://localhost:3000/bb-admin/api`

5. **Create API Key**
   Use admin UI or API endpoint

6. **Test External API**
   ```bash
   curl -X POST http://localhost:8080/bb-api/external/YOUR_KEY/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello!"}'
   ```

---

## Examples

See [Integration Guide](./INTEGRATION_GUIDE.md) for language-specific examples:
- Node.js
- Python
- PHP
- cURL
- JavaScript (Browser)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
- **Documentation:** [Full Docs](./API_REFERENCE.md)
- **Admin UI:** `/bb-admin/api`

---

## License

MIT License - See LICENSE file for details

---

**Last Updated:** November 12, 2024
**Component Version:** 1.0.0
