# Token Analytics Plugin

Comprehensive LLM token usage analytics and management plugin for Bookbag CE.

## Features

- **Real-time Token Tracking**: Automatically captures token usage for all LLM requests
- **Multi-level Limits**: Enforces global, per-user, and per-chat token limits
- **Cost Estimation**: Calculates estimated costs based on model pricing
- **Performance Metrics**: Tracks tokens/second, duration, and throughput
- **Detailed Analytics**: Provides comprehensive usage reports and insights
- **Flexible Configuration**: Configurable limits with daily/weekly/monthly/yearly periods

## Plugin Structure

```
tokens-plugin/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       ├── tokensController.js      # Analytics endpoints
│   │       └── settingsController.js    # Settings management
│   ├── models/
│   │   ├── tokenUsage.js                # Token usage model
│   │   ├── tokenSettings.js             # Settings model
│   │   ├── tokensContext.js             # Database context
│   │   └── db/
│   │       └── migrations/
│   │           └── 1760328420572_Init_migration.js
│   └── hooks/
│       ├── llmBeforeGenerateHandler.js  # Pre-request limit checking
│       ├── llmAfterGenerateHandler.js   # Post-request usage capture
│       └── chatAfterMessageHandler.js   # Message-level logging
├── config/
│   ├── routes.js                        # Route definitions
│   └── environments/
│       └── development.json             # Database config
├── nextjs/
│   └── admin/
│       └── tokens/
│           ├── analytics/               # Analytics dashboard (TODO)
│           └── settings/                # Settings page (TODO)
├── index.js                             # Plugin entry point
├── plugin.json                          # Plugin metadata
├── package.json                         # Dependencies
└── README.md                            # This file
```

## Database Schema

### TokenUsage Table
Stores detailed token usage for each LLM request:

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key |
| chat_id | INTEGER | Associated chat ID |
| message_id | INTEGER | Associated message ID |
| user_id | INTEGER | User who made the request |
| model_id | INTEGER | Model used |
| model_name | STRING | Model name (e.g., "gpt-4") |
| provider | STRING | LLM provider |
| prompt_tokens | INTEGER | Input tokens |
| completion_tokens | INTEGER | Output tokens |
| total_tokens | INTEGER | Total tokens used |
| request_start_time | INTEGER | Request start timestamp |
| request_end_time | INTEGER | Request end timestamp |
| duration_ms | INTEGER | Request duration in milliseconds |
| tokens_per_second | FLOAT | Throughput metric |
| estimated_cost | FLOAT | Estimated cost in USD |
| workspace_id | INTEGER | Workspace ID |
| session_id | STRING | Session identifier |
| request_metadata | TEXT | Additional metadata (JSON) |
| created_at | INTEGER | Record creation timestamp |

### TokenSettings Table
Stores global token limit configuration:

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key |
| global_token_limit | INTEGER | Global token limit |
| global_limit_period | STRING | Period (daily/weekly/monthly/yearly) |
| global_limit_enabled | INTEGER | Enable global limit (0/1) |
| per_user_token_limit | INTEGER | Per-user token limit |
| per_user_limit_period | STRING | Period for per-user limit |
| per_user_limit_enabled | INTEGER | Enable per-user limit (0/1) |
| per_chat_token_limit | INTEGER | Per-chat token limit |
| per_chat_limit_enabled | INTEGER | Enable per-chat limit (0/1) |
| rate_limit_enabled | INTEGER | Enable rate limiting (0/1) |
| rate_limit_requests | INTEGER | Max requests in window |
| rate_limit_window | INTEGER | Rate limit window (seconds) |
| notify_on_limit_reached | INTEGER | Send notifications (0/1) |
| notify_threshold | INTEGER | Notification threshold (%) |
| track_costs | INTEGER | Track costs (0/1) |
| currency | STRING | Currency code (e.g., "USD") |
| created_at | INTEGER | Record creation timestamp |
| updated_at | INTEGER | Last update timestamp |

## API Endpoints

### Token Analytics

**GET** `/bb-tokens/api/tokens/analytics`
Get comprehensive token usage analytics.

Query Parameters:
- `userId` - Filter by user ID
- `startDate` - Start date timestamp
- `endDate` - End date timestamp
- `modelId` - Filter by model ID
- `period` - Aggregation period (hourly/daily/weekly/monthly)

Response:
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
    "gpt-4": { "requests": 500, "tokens": 250000, "cost": 8.50 },
    "gpt-3.5-turbo": { "requests": 750, "tokens": 208920, "cost": 3.95 }
  },
  "byUser": {
    "1": { "requests": 400, "tokens": 150000, "cost": 4.20 },
    "2": { "requests": 850, "tokens": 308920, "cost": 8.25 }
  },
  "timeline": [
    { "timestamp": "2024-01-01", "requests": 150, "tokens": 55000, "cost": 1.75 },
    { "timestamp": "2024-01-02", "requests": 200, "tokens": 75000, "cost": 2.30 }
  ]
}
```

**GET** `/bb-tokens/api/tokens/user-stats`
Get usage stats for current user.

Response:
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

**GET** `/bb-tokens/api/tokens/recent-activity`
Get recent token usage activity.

Query Parameters:
- `limit` - Max records to return (default: 50)
- `userId` - Filter by user ID
- `chatId` - Filter by chat ID

### Settings Management

**GET** `/bb-tokens/api/settings`
Get current token settings.

**POST** `/bb-tokens/api/settings`
Update token settings (requires admin).

Request Body:
```json
{
  "global_token_limit": 1000000,
  "global_limit_period": "monthly",
  "global_limit_enabled": 1,
  "per_user_token_limit": 50000,
  "per_user_limit_period": "monthly",
  "per_user_limit_enabled": 1,
  "notify_threshold": 90
}
```

**GET** `/bb-tokens/api/settings/check-limits`
Check current usage against configured limits.

Response:
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
    }
  ]
}
```

## Hooks

### LLM_BEFORE_GENERATE
**File**: `app/hooks/llmBeforeGenerateHandler.js`

Runs before each LLM request to check if token limits have been exceeded.

Context Parameters:
- `userId` - User making the request
- `chatId` - Chat ID
- `messageId` - Message ID
- `model` - Model configuration
- `prompt` - Request prompt

Error Response:
```javascript
{
  code: 'TOKEN_LIMIT_EXCEEDED',
  type: 'global' | 'per_user' | 'per_chat',
  message: 'Token limit exceeded...'
}
```

### LLM_AFTER_GENERATE
**File**: `app/hooks/llmAfterGenerateHandler.js`

Runs after each LLM response to capture token usage and metrics.

Context Parameters:
- `userId` - User ID
- `chatId` - Chat ID
- `messageId` - Message ID
- `model` - Model configuration
- `usage` - Token usage data
- `requestStartTime` - Request start timestamp
- `response` - LLM response

Captured Data:
- Prompt tokens
- Completion tokens
- Total tokens
- Duration in milliseconds
- Tokens per second
- Estimated cost

### CHAT_AFTER_MESSAGE
**File**: `app/hooks/chatAfterMessageHandler.js`

Runs after message is saved for audit trail and logging.

## Cost Estimation

The plugin includes pricing tables for common models:

| Model | Prompt Cost | Completion Cost |
|-------|-------------|-----------------|
| GPT-4 | $0.03/1K | $0.06/1K |
| GPT-4 Turbo | $0.01/1K | $0.03/1K |
| GPT-3.5 Turbo | $0.001/1K | $0.002/1K |
| Claude 3 Opus | $0.015/1K | $0.075/1K |
| Claude 3 Sonnet | $0.003/1K | $0.015/1K |
| Claude 3 Haiku | $0.00025/1K | $0.00125/1K |

Cost calculation:
```
cost = (prompt_tokens / 1000 * prompt_price) + (completion_tokens / 1000 * completion_price)
```

## Installation

1. Plugin is located in `bb-plugins/tokens-plugin/`
2. Plugin loader will automatically detect and load it
3. Run database migrations on first load:
   ```bash
   cd /path/to/bookbag-ce
   node server.js
   ```

## Testing

### Test Plugin Activation
```bash
# Start server and check logs
cd /Users/alexanderrich/Documents/development/bookbaghq/bookbag-ce
node server.js

# Look for:
# 🔌 Loading Tokens Plugin...
# ✓ Tokens plugin routes loaded
# 🪝 Registering Tokens Plugin hooks...
# ✓ All Tokens Plugin hooks registered
```

### Test API Endpoints
```bash
# Get analytics
curl http://localhost:8080/bb-tokens/api/tokens/analytics

# Get settings
curl http://localhost:8080/bb-tokens/api/settings

# Check limits
curl http://localhost:8080/bb-tokens/api/settings/check-limits
```

### Test Token Tracking
1. Start a chat session
2. Send a message to trigger LLM request
3. Check database for token usage record:
   ```sql
   SELECT * FROM TokenUsage ORDER BY created_at DESC LIMIT 1;
   ```

## Configuration

Edit `config/environments/development.json` to change database settings:
```json
{
  "database": "tokens",
  "connection": "default"
}
```

## Troubleshooting

**Plugin not loading:**
- Check that `index.js` exports `{ load, activate, deactivate }`
- Verify plugin.json exists and is valid JSON
- Check server logs for errors

**Hooks not firing:**
- Verify hook constants are correct
- Check that hookService is registering hooks
- Look for errors in hook handler files

**Database errors:**
- Ensure migrations have run successfully
- Check database connection settings
- Verify table schemas match models

**Token limits not enforcing:**
- Check that limits are enabled in settings
- Verify LLM_BEFORE_GENERATE hook is registered
- Review error handling in llmBeforeGenerateHandler.js

## Development

### Adding New Analytics
1. Add query logic to `tokensController.js`
2. Create new route in `config/routes.js`
3. Update API documentation

### Modifying Token Limits
1. Update `TokenSettings` model if schema changes needed
2. Modify `settingsController.js` for new logic
3. Update limit checking in `llmBeforeGenerateHandler.js`

### Adding Cost Models
Update pricing table in `llmAfterGenerateHandler.js`:
```javascript
const pricingTable = {
  'your-model-name': {
    prompt: 0.001 / 1000,    // per token
    completion: 0.002 / 1000  // per token
  }
};
```

## License

MIT

## Support

For issues and questions:
- GitHub: https://github.com/bookbaghq/bookbag-ce/issues
- Documentation: https://docs.bookbaghq.com
