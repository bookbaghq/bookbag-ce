# Tokens Plugin - API Reference

Comprehensive API documentation for the Tokens Plugin token analytics and management endpoints.

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Token Analytics Endpoints](#token-analytics-endpoints)
6. [Settings Management Endpoints](#settings-management-endpoints)

## Base URL

```
http://localhost:8080/bb-tokens/api
```

All endpoints are prefixed with this base URL.

## Authentication

All endpoints require authentication via session cookie. Admin endpoints require `isAdmin` role.

## Response Format

All responses are JSON formatted:

```json
{
  "success": true,
  "data": {}
}
```

Error responses include:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Error Handling

Common HTTP Status Codes:
- `200 OK` - Request successful
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

## Token Analytics Endpoints

### Get Comprehensive Analytics

**Endpoint:** `GET /tokens/analytics`

Returns comprehensive token usage analytics with aggregation by model, user, and timeline.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | Aggregation period: `hourly`, `daily`, `weekly`, `monthly` (default: `daily`) |
| `userId` | integer | No | Filter by specific user ID |
| `startDate` | integer | No | Start timestamp in milliseconds |
| `endDate` | integer | No | End timestamp in milliseconds |
| `modelId` | integer | No | Filter by model ID |

**Example Request:**

```bash
curl "http://localhost:8080/bb-tokens/api/tokens/analytics?period=daily&userId=1&startDate=1704067200000&endDate=1704153600000"
```

**Response:**

```json
{
  "totalRequests": 1250,
  "totalTokens": 458920,
  "totalPromptTokens": 298450,
  "totalCompletionTokens": 160470,
  "totalCost": 12.45,
  "avgTokensPerRequest": 367,
  "avgDuration": 1250,
  "avgTokensPerSecond": 45.2,
  "byModel": {
    "gpt-4": {
      "requests": 500,
      "tokens": 250000,
      "cost": 8.50
    },
    "gpt-3.5-turbo": {
      "requests": 750,
      "tokens": 208920,
      "cost": 3.95
    }
  },
  "byUser": {
    "1": {
      "requests": 400,
      "tokens": 150000,
      "cost": 4.20
    },
    "2": {
      "requests": 850,
      "tokens": 308920,
      "cost": 8.25
    }
  },
  "timeline": [
    {
      "timestamp": "2024-01-01",
      "requests": 150,
      "tokens": 55000,
      "cost": 1.75
    },
    {
      "timestamp": "2024-01-02",
      "requests": 200,
      "tokens": 75000,
      "cost": 2.30
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `totalRequests` | integer | Total number of LLM requests |
| `totalTokens` | integer | Total tokens used across all requests |
| `totalPromptTokens` | integer | Total input/prompt tokens |
| `totalCompletionTokens` | integer | Total output/completion tokens |
| `totalCost` | float | Estimated total cost in USD |
| `avgTokensPerRequest` | integer | Average tokens per request (rounded) |
| `avgDuration` | integer | Average request duration in milliseconds |
| `avgTokensPerSecond` | float | Average tokens generated per second |
| `byModel` | object | Token usage aggregated by model name |
| `byUser` | object | Token usage aggregated by user ID |
| `timeline` | array | Time-series data points |

---

### Get User Statistics

**Endpoint:** `GET /tokens/user-stats`

Returns token usage statistics for the currently authenticated user.

**Query Parameters:** None

**Example Request:**

```bash
curl "http://localhost:8080/bb-tokens/api/tokens/user-stats" \
  -H "Cookie: session=your_session_id"
```

**Response:**

```json
{
  "userId": 1,
  "period": "monthly",
  "usage": {
    "requests": 400,
    "tokens": 150000,
    "cost": 4.20
  },
  "limit": {
    "enabled": 1,
    "tokens": 200000,
    "percentage": "75.0"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | integer | Authenticated user ID |
| `period` | string | Limit period setting |
| `usage.requests` | integer | Number of requests in current period |
| `usage.tokens` | integer | Tokens used in current period |
| `usage.cost` | float | Estimated cost for current period |
| `limit.enabled` | integer | Whether per-user limit is enabled (0 or 1) |
| `limit.tokens` | integer | Maximum tokens allowed for user |
| `limit.percentage` | string | Current usage as percentage of limit |

---

### Get Recent Activity

**Endpoint:** `GET /tokens/recent-activity`

Returns recent token usage records.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Maximum records to return (default: 50, max: 1000) |
| `userId` | integer | No | Filter by user ID |
| `chatId` | integer | No | Filter by chat ID |

**Example Request:**

```bash
curl "http://localhost:8080/bb-tokens/api/tokens/recent-activity?limit=100&userId=1"
```

**Response:**

```json
[
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
    "estimated_cost": 0.015,
    "workspace_id": 1,
    "session_id": "sess_abc123",
    "request_metadata": "{\"temperature\": 0.7}",
    "created_at": "1704067201500"
  }
]
```

**Response Fields (Per Record):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique usage record ID |
| `chat_id` | integer | Associated chat session ID |
| `message_id` | integer | Associated message ID |
| `user_id` | integer | User who made the request |
| `model_id` | integer | Model ID (if applicable) |
| `model_name` | string | Model name (e.g., "gpt-4") |
| `provider` | string | LLM provider (e.g., "openai") |
| `prompt_tokens` | integer | Input/prompt tokens used |
| `completion_tokens` | integer | Output/completion tokens used |
| `total_tokens` | integer | Total tokens (prompt + completion) |
| `request_start_time` | integer | Request start timestamp (ms) |
| `request_end_time` | integer | Request end timestamp (ms) |
| `duration_ms` | integer | Total request duration in milliseconds |
| `tokens_per_second` | float | Tokens generated per second |
| `estimated_cost` | float | Estimated cost in USD |
| `workspace_id` | integer | Associated workspace ID |
| `session_id` | string | Session identifier |
| `request_metadata` | string | JSON string of additional metadata |
| `created_at` | string | Record creation timestamp (ms) |

---

## Settings Management Endpoints

### Get Current Settings

**Endpoint:** `GET /settings`

Retrieves current token settings and configuration.

**Query Parameters:** None

**Example Request:**

```bash
curl "http://localhost:8080/bb-tokens/api/settings"
```

**Response:**

```json
{
  "id": 1,
  "global_token_limit": 1000000,
  "global_limit_period": "monthly",
  "global_limit_enabled": 1,
  "per_user_token_limit": 50000,
  "per_user_limit_period": "monthly",
  "per_user_limit_enabled": 1,
  "per_chat_token_limit": 10000,
  "per_chat_limit_enabled": 0,
  "rate_limit_enabled": 0,
  "rate_limit_requests": 100,
  "rate_limit_window": 60,
  "notify_on_limit_reached": 1,
  "notify_threshold": 90,
  "track_costs": 1,
  "currency": "USD",
  "created_at": "1704067200000",
  "updated_at": "1704067200000"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Settings record ID (always 1) |
| `global_token_limit` | integer | Total tokens allowed across all users |
| `global_limit_period` | string | Period for global limit: `daily`, `weekly`, `monthly`, `yearly` |
| `global_limit_enabled` | integer | Whether global limit is enforced (0 or 1) |
| `per_user_token_limit` | integer | Tokens allowed per user |
| `per_user_limit_period` | string | Period for per-user limit |
| `per_user_limit_enabled` | integer | Whether per-user limit is enforced |
| `per_chat_token_limit` | integer | Tokens allowed per chat |
| `per_chat_limit_enabled` | integer | Whether per-chat limit is enforced |
| `rate_limit_enabled` | integer | Whether rate limiting is enabled |
| `rate_limit_requests` | integer | Max requests in window |
| `rate_limit_window` | integer | Rate limit window in seconds |
| `notify_on_limit_reached` | integer | Send notifications when approaching limits |
| `notify_threshold` | integer | Notification threshold as percentage (1-100) |
| `track_costs` | integer | Whether to calculate and track costs |
| `currency` | string | Currency code for cost tracking (USD, EUR, GBP, JPY) |
| `created_at` | string | Settings creation timestamp |
| `updated_at` | string | Last update timestamp |

---

### Update Settings

**Endpoint:** `POST /settings`

Updates token settings. **Requires admin permissions.**

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "global_token_limit": 1000000,
  "global_limit_period": "monthly",
  "global_limit_enabled": 1,
  "per_user_token_limit": 50000,
  "per_user_limit_period": "monthly",
  "per_user_limit_enabled": 1,
  "per_chat_token_limit": 10000,
  "per_chat_limit_enabled": 1,
  "rate_limit_enabled": 1,
  "rate_limit_requests": 100,
  "rate_limit_window": 60,
  "notify_on_limit_reached": 1,
  "notify_threshold": 90,
  "track_costs": 1,
  "currency": "USD"
}
```

**Body Fields:** All fields are optional. Only provided fields will be updated.

**Example Request:**

```bash
curl -X POST "http://localhost:8080/bb-tokens/api/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "global_token_limit": 2000000,
    "per_user_token_limit": 100000,
    "per_user_limit_enabled": 1,
    "notify_threshold": 85
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": {
    "id": 1,
    "global_token_limit": 2000000,
    "global_limit_period": "monthly",
    "global_limit_enabled": 1,
    "per_user_token_limit": 100000,
    "per_user_limit_period": "monthly",
    "per_user_limit_enabled": 1,
    "per_chat_token_limit": 10000,
    "per_chat_limit_enabled": 1,
    "rate_limit_enabled": 1,
    "rate_limit_requests": 100,
    "rate_limit_window": 60,
    "notify_on_limit_reached": 1,
    "notify_threshold": 85,
    "track_costs": 1,
    "currency": "USD",
    "created_at": "1704067200000",
    "updated_at": "1704067260000"
  }
}
```

**Error Response (Not Admin):**

```json
{
  "success": false,
  "error": "Unauthorized: Admin access required"
}
```

---

### Check Limits

**Endpoint:** `GET /settings/check-limits`

Checks current usage against configured limits. **Admin endpoint.**

**Query Parameters:** None

**Example Request:**

```bash
curl "http://localhost:8080/bb-tokens/api/settings/check-limits"
```

**Response:**

```json
{
  "limits": [
    {
      "type": "global",
      "limit": 1000000,
      "usage": 458920,
      "percentage": "45.9",
      "period": "monthly",
      "exceeded": false
    },
    {
      "type": "per_user",
      "limit": 50000,
      "usage": 15000,
      "percentage": "30.0",
      "period": "monthly",
      "exceeded": false
    },
    {
      "type": "per_chat",
      "limit": 10000,
      "usage": 5000,
      "percentage": "50.0",
      "period": "session",
      "exceeded": false
    }
  ]
}
```

**Response Fields (Per Limit):**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Limit type: `global`, `per_user`, `per_chat` |
| `limit` | integer | Configured limit value |
| `usage` | integer | Current usage |
| `percentage` | string | Usage as percentage of limit |
| `period` | string | Limit period |
| `exceeded` | boolean | Whether limit is exceeded |

---

## Examples

### JavaScript Fetch

```javascript
// Get analytics
const analytics = await fetch(
  'http://localhost:8080/bb-tokens/api/tokens/analytics?period=daily'
).then(r => r.json());

console.log(`Total tokens: ${analytics.totalTokens}`);
console.log(`Total cost: $${analytics.totalCost.toFixed(2)}`);

// Update settings
const response = await fetch(
  'http://localhost:8080/bb-tokens/api/settings',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      per_user_token_limit: 100000,
      per_user_limit_enabled: 1,
      notify_threshold: 85
    })
  }
);

const result = await response.json();
console.log(result.message);
```

### Python Requests

```python
import requests

# Get user stats
response = requests.get(
    'http://localhost:8080/bb-tokens/api/tokens/user-stats'
)
stats = response.json()

print(f"Tokens used: {stats['usage']['tokens']}")
print(f"Requests: {stats['usage']['requests']}")

# Check limits
limits_response = requests.get(
    'http://localhost:8080/bb-tokens/api/settings/check-limits'
)
limits = limits_response.json()

for limit in limits['limits']:
    print(f"{limit['type']}: {limit['usage']}/{limit['limit']}")
```

### cURL

```bash
# Get analytics for a specific user and period
curl "http://localhost:8080/bb-tokens/api/tokens/analytics?period=daily&userId=1" \
  -H "Accept: application/json"

# Update settings
curl -X POST "http://localhost:8080/bb-tokens/api/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "per_user_token_limit": 100000,
    "per_user_limit_enabled": 1
  }'

# Get recent activity
curl "http://localhost:8080/bb-tokens/api/tokens/recent-activity?limit=50&userId=1"
```

---

## Rate Limiting

When rate limiting is enabled in settings:
- Maximum requests are enforced per time window
- Excess requests return `429 Too Many Requests`
- Rate limit status is included in response headers (if implemented)

## Pagination

The `recent-activity` endpoint supports pagination via the `limit` parameter (max 1000).

For larger datasets, use date filtering with `startDate` and `endDate` parameters on the `analytics` endpoint.

## Caching

- Analytics endpoints may be cached client-side for 1 minute
- Settings are cached server-side and updated immediately on POST
- Use appropriate cache headers in production

