# Tokens Plugin - Complete Documentation

Comprehensive technical documentation for the Token Analytics Plugin for Bookbag CE.

## Quick Start

- **README.md** - Overview, features, and installation
- **API.md** - Complete API endpoint reference
- **DATABASE.md** - Database schema, models, and queries

## Plugin Overview

The **Tokens Plugin** provides comprehensive LLM token usage analytics, monitoring, and limit enforcement for Bookbag CE. It automatically tracks token consumption across all LLM requests, enforces multi-level limits, estimates costs, and provides detailed analytics.

### Key Features

- **Real-time Token Tracking** - Automatically captures token usage for all LLM requests
- **Multi-level Limits** - Enforces global, per-user, and per-chat token limits
- **Cost Estimation** - Calculates estimated costs based on model pricing
- **Performance Metrics** - Tracks tokens/second, duration, and throughput
- **Detailed Analytics** - Provides comprehensive usage reports and insights
- **Flexible Configuration** - Configurable limits with daily/weekly/monthly/yearly periods
- **Admin Dashboard** - Web-based settings and analytics views

## Architecture Overview

### Plugin Structure

```
tokens-plugin/
├── app/
│   ├── controllers/api/
│   │   ├── tokensController.js      # Analytics endpoints
│   │   └── settingsController.js    # Settings management
│   ├── models/
│   │   ├── tokenUsage.js            # Usage record schema
│   │   ├── tokenSettings.js         # Settings schema
│   │   ├── tokensContext.js         # Database context
│   │   └── db/migrations/
│   │       └── 1760328420572_Init_migration.js
│   └── hooks/
│       ├── llmBeforeGenerateHandler.js  # Pre-request limit checking
│       ├── llmAfterGenerateHandler.js   # Post-request usage capture
│       └── chatAfterMessageHandler.js   # Message-level logging
├── config/
│   ├── routes.js                    # Route definitions
│   ├── environments/
│   │   └── development.json         # Database configuration
│   └── initializers/
│       └── config.js                # Context initialization
├── nextjs/
│   ├── admin/
│   │   └── tokens/
│   │       ├── analytics/page.js    # Analytics dashboard
│   │       └── settings/page.js     # Settings management UI
│   └── admin.js                     # Component exports
├── index.js                         # Plugin entry point
├── plugin.json                      # Plugin metadata
├── build.js                         # Build script
├── package.json                     # Dependencies
└── db/
    └── development.sqlite3          # SQLite database

```

### Data Flow Diagram

```
User Chat Input
    ↓
LLM_BEFORE_GENERATE Hook
    ├─→ Check global token limit
    ├─→ Check per-user token limit
    ├─→ Check per-chat token limit
    └─→ Store request start time
    ↓
LLM Generation
    ↓
LLM_AFTER_GENERATE Hook
    ├─→ Capture token usage (prompt, completion, total)
    ├─→ Calculate performance metrics (duration, speed)
    ├─→ Estimate costs based on model pricing
    ├─→ Save TokenUsage record to database
    └─→ Check and notify if approaching limits
    ↓
CHAT_AFTER_MESSAGE Hook
    └─→ Log message event (audit trail)
    ↓
Analytics/Reporting
    ├─→ /tokens/analytics - Aggregated analytics
    ├─→ /tokens/user-stats - Per-user statistics
    └─→ /tokens/recent-activity - Recent records
```

## Core Components

### 1. Hook Handlers

#### LLM_BEFORE_GENERATE Hook

**File:** `app/hooks/llmBeforeGenerateHandler.js`

Runs before each LLM request to enforce token limits.

**Responsibilities:**
- Fetch current token settings
- Calculate period start time based on configured period
- Query TokenUsage table for usage in current period
- Check if global, per-user, or per-chat limits are exceeded
- Throw error if limit exceeded (prevents LLM request)
- Store request start time in context for later use

**Context Parameters:**
- `messageHistory` - Conversation history
- `chatId` - Current chat ID
- `workspaceId` - Workspace context
- `modelConfig` - Model configuration
- `currentUser` - Current user object

**Key Logic:**

```javascript
// Check global limit
if (settings.global_limit_enabled) {
    const totalUsage = await tokensContext.TokenUsage
        .where({ created_at: { $gte: periodStart } })
        .sum('total_tokens');

    if (totalUsage >= settings.global_token_limit) {
        throw {
            code: 'TOKEN_LIMIT_EXCEEDED',
            type: 'global',
            currentUsage: totalUsage,
            limit: settings.global_token_limit
        };
    }
}
```

#### LLM_AFTER_GENERATE Hook

**File:** `app/hooks/llmAfterGenerateHandler.js`

Runs after LLM response to capture token usage metrics.

**Responsibilities:**
- Extract token usage from LLM response
- Calculate timing metrics (duration, tokens/second)
- Create TokenUsage record with all metrics
- Calculate estimated cost if cost tracking enabled
- Save record to database
- Check if usage approaching limits and notify if needed

**Context Parameters:**
- `response` - LLM response object with `usage` field
- `model` - Model information
- `currentUser` - User who made request
- `chatId`, `messageId` - Message context
- `_tokenRequestStartTime` - Start time from before hook

**Cost Calculation:**

```javascript
const pricingTable = {
    'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
    'gpt-4-turbo': { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
    'gpt-3.5-turbo': { prompt: 0.001 / 1000, completion: 0.002 / 1000 },
    'claude-3-opus': { prompt: 0.015 / 1000, completion: 0.075 / 1000 },
    'claude-3-sonnet': { prompt: 0.003 / 1000, completion: 0.015 / 1000 },
    'claude-3-haiku': { prompt: 0.00025 / 1000, completion: 0.00125 / 1000 },
};

const cost = (promptTokens * pricing.prompt) + (completionTokens * pricing.completion);
```

#### CHAT_AFTER_MESSAGE Hook

**File:** `app/hooks/chatAfterMessageHandler.js`

Runs after message is saved for audit trail.

**Responsibilities:**
- Log message event with context
- Minimal processing (main tracking in LLM hooks)
- Future: update real-time dashboards, trigger webhooks

**Current Usage:** Mainly for logging/audit trail

---

### 2. Controllers

#### Tokens Analytics Controller

**File:** `app/controllers/api/tokensController.js`

Provides analytics and usage statistics endpoints.

**Methods:**

##### getAnalytics()

Returns comprehensive aggregated analytics.

**Query Parameters:**
- `period` - Aggregation period (hourly, daily, weekly, monthly)
- `userId` - Filter by user
- `startDate`, `endDate` - Date range
- `modelId` - Filter by model

**Logic Flow:**
1. Fetch all TokenUsage records
2. Apply filters (user, date, model)
3. Calculate aggregate metrics
4. Group by model
5. Group by user
6. Create timeline based on period
7. Return analytics object

**Key Calculations:**
- `totalTokens` = sum of all total_tokens
- `avgTokensPerRequest` = totalTokens / numberOfRequests
- `avgDuration` = sum of all duration_ms / numberOfRequests
- `avgTokensPerSecond` = average of all tokens_per_second values

##### getUserStats()

Returns token usage for authenticated user.

**Logic:**
1. Get current user ID from session
2. Fetch current TokenSettings
3. Calculate period start based on per_user_limit_period
4. Query TokenUsage for current user in current period
5. Calculate usage totals
6. Calculate percentage of limit
7. Return stats with limit info

##### getRecentActivity()

Returns recent token usage records with pagination.

**Query Parameters:**
- `limit` - Max records (default 50, max 1000)
- `userId` - Filter by user
- `chatId` - Filter by chat

**Logic:**
1. Apply filters
2. Order by created_at DESC
3. Limit results
4. Return array of TokenUsage records

---

#### Settings Management Controller

**File:** `app/controllers/api/settingsController.js`

Manages token settings and configuration.

**Methods:**

##### getSettings()

Returns current token settings or defaults.

**Logic:**
1. Query TokenSettings table
2. If no record, return defaults
3. Return settings object

##### updateSettings()

Updates token settings (admin only).

**Permissions:** Requires `isAdmin` = true

**Logic:**
1. Verify admin permissions
2. Get existing settings or create new
3. Update provided fields
4. Set updated_at timestamp
5. Save to database
6. Return updated settings

**Updatable Fields:**
- Global, per-user, per-chat limits
- Limit periods
- Enable/disable flags
- Rate limit settings
- Notification settings
- Cost tracking settings

##### checkLimits()

Checks current usage against limits.

**Logic:**
1. Get TokenSettings
2. For each enabled limit type:
   - Calculate usage in current period
   - Calculate percentage of limit
   - Determine if exceeded
3. Return array of limit status objects

---

### 3. Models

#### TokenUsage Model

**File:** `app/models/tokenUsage.js`

Represents a single token usage record.

**Fields (20 total):**

Core IDs:
- `id` - Primary key (auto)
- `chat_id`, `message_id`, `user_id`, `model_id` - References

Model Info:
- `model_name` - Model identifier (gpt-4, claude-3-opus, etc)
- `provider` - LLM provider (openai, anthropic, etc)

Token Counts:
- `prompt_tokens` - Input tokens
- `completion_tokens` - Output tokens
- `total_tokens` - Sum of prompt + completion

Timing:
- `request_start_time` - Start timestamp (ms)
- `request_end_time` - End timestamp (ms)
- `duration_ms` - Total duration
- `tokens_per_second` - Throughput metric

Cost:
- `estimated_cost` - Calculated cost

Metadata:
- `workspace_id` - Workspace context
- `session_id` - Session identifier
- `request_metadata` - Additional JSON data
- `created_at` - Record timestamp

#### TokenSettings Model

**File:** `app/models/tokenSettings.js`

Global configuration for token limits.

**Fields (18 total):**

Global Limits:
- `global_token_limit` - Limit across all users
- `global_limit_period` - daily/weekly/monthly/yearly
- `global_limit_enabled` - 0 or 1

Per-User Limits:
- `per_user_token_limit` - Limit per user
- `per_user_limit_period` - daily/weekly/monthly/yearly
- `per_user_limit_enabled` - 0 or 1

Per-Chat Limits:
- `per_chat_token_limit` - Limit per chat
- `per_chat_limit_enabled` - 0 or 1

Rate Limiting:
- `rate_limit_enabled` - 0 or 1
- `rate_limit_requests` - Max requests
- `rate_limit_window` - Window in seconds

Notifications:
- `notify_on_limit_reached` - 0 or 1
- `notify_threshold` - Percentage (1-100)

Cost Tracking:
- `track_costs` - 0 or 1
- `currency` - USD, EUR, GBP, JPY

Timestamps:
- `created_at` - Creation time
- `updated_at` - Last update time

#### TokensContext Model

**File:** `app/models/tokensContext.js`

MasterRecord database context for tokens plugin.

**Provides:**
- `TokenUsage` - TokenUsage model access
- `TokenSettings` - TokenSettings model access
- Automatic schema loading
- Query building

**Usage:**

```javascript
const tokensContext = new TokensContext();

// Create
const usage = new TokenUsage();
usage.user_id = 1;
await tokensContext.TokenUsage.add(usage);

// Read
const records = await tokensContext.TokenUsage
    .where({ user_id: 1 })
    .toList();

// Update
settings.notify_threshold = 85;
await tokensContext.TokenSettings.update(settings);

// Aggregate
const total = await tokensContext.TokenUsage
    .where({ user_id: 1 })
    .sum('total_tokens');
```

---

### 4. Routes

**File:** `config/routes.js`

Defines all API routes using MasterController routing.

```javascript
// Analytics routes
router.route('bb-tokens/api/tokens/analytics', 'api/tokens#getAnalytics', 'get');
router.route('bb-tokens/api/tokens/user-stats', 'api/tokens#getUserStats', 'get');
router.route('bb-tokens/api/tokens/recent-activity', 'api/tokens#getRecentActivity', 'get');

// Settings routes
router.route('bb-tokens/api/settings', 'api/settings#getSettings', 'get');
router.route('bb-tokens/api/settings', 'api/settings#updateSettings', 'post');
router.route('bb-tokens/api/settings/check-limits', 'api/settings#checkLimits', 'get');
```

**Route Format:** `path`, `controller#method`, `verb`

**Controller Resolution:** MasterController resolves `api/tokens#getAnalytics` to:
- Plugin: `tokens-plugin`
- Path: `app/controllers/api/tokensController.js`
- Class method: `getAnalytics()`

---

### 5. Admin UI Components

#### Token Settings Page

**File:** `nextjs/admin/tokens/settings/page.js`

React component for managing token settings.

**Features:**
- Enable/disable each limit type
- Set limit values and periods
- Configure rate limiting
- Set notification thresholds
- Enable cost tracking
- Select currency
- Save/refresh buttons
- Success/error messages

**API Integration:**
- Fetch settings on mount
- Submit updates via POST
- Real-time validation

#### Token Analytics Page

**File:** `nextjs/admin/tokens/analytics/page.js`

React component for viewing analytics.

**Features:**
- Overview cards (requests, tokens, cost, etc)
- Filter by user, model, date range
- Period selection (hourly, daily, weekly, monthly)
- Tabs for different views:
  - By Model - Token usage per model
  - By User - Token usage per user
  - Timeline - Usage over time
- Responsive grid layout

**API Integration:**
- Fetch analytics based on filters
- Real-time updates when filters change
- Detailed logging of URL construction

---

### 6. Plugin Lifecycle

**File:** `index.js`

Main plugin entry point with lifecycle methods.

#### load(pluginAPI)

Called when plugin is first loaded.

**Responsibilities:**
1. Import hook handlers
2. Register MasterController component
3. Register admin views
4. Register client components
5. Register all hooks

**Hooks Registered:**
- `LLM_BEFORE_GENERATE` - Check limits (priority 10)
- `LLM_AFTER_GENERATE` - Track usage (priority 10)
- `CHAT_AFTER_MESSAGE` - Log messages (priority 10)
- `ADMIN_MENU` - Add menu items (priority 10)

#### activate(pluginAPI)

Called on first activation.

**Responsibilities:**
1. Run database migrations
2. Create symlinks for Next.js
3. Create storage directories
4. Fire PLUGIN_ACTIVATED hook

#### deactivate(pluginAPI)

Called when plugin is deactivated.

**Responsibilities:**
1. Clean up resources
2. Fire PLUGIN_DEACTIVATED hook

---

## Integration Points

### Database Integration

- Uses **MasterRecord** ORM (Bookbag's data layer)
- SQLite database isolated to plugin
- Migrations handled via MasterRecord schema system
- Context registered as singleton via MasterController

### Hook System Integration

- Uses generic **Hook System** from core
- Hooks available: LLM_BEFORE_GENERATE, LLM_AFTER_GENERATE, CHAT_AFTER_MESSAGE, ADMIN_MENU
- Hook handlers receive context object with all metadata
- Filters can modify/block requests
- Actions run asynchronously

### UI Integration

- Admin views registered via `registerView()`
- Client components registered via `registerClientComponent()`
- Next.js components in `/nextjs` directory
- Admin menu items added dynamically

### HTTP Routing

- Routes defined in `config/routes.js`
- MasterController router system
- RESTful API following conventions
- Session-based authentication

---

## Performance Considerations

### Query Optimization

1. **Always filter by date when querying TokenUsage**
   - Prevents scanning entire table
   - Use period boundaries to scope queries

2. **Use aggregation for large datasets**
   - `sum()`, `count()` instead of fetching all records
   - Database handles aggregation

3. **Implement pagination for large result sets**
   - Use `limit()` and `skip()`
   - Default limit of 50, max 1000

4. **Consider indexing for production**
   - Index on user_id
   - Index on created_at
   - Composite index on (user_id, created_at)

### Cost Calculation Performance

- Pricing lookup uses string matching (O(n) but small table)
- Cost calculated once per request
- Consider caching pricing table if it grows

### Caching Strategy

- Analytics data can be cached 1-5 minutes
- Settings can be cached longer (rarely change)
- Recent activity should be real-time
- User stats should be fresh (cache 1 min max)

---

## Error Handling

### Token Limit Exceeded Errors

When a limit is exceeded in LLM_BEFORE_GENERATE hook:

```javascript
const error = new Error('Token limit exceeded...');
error.code = 'TOKEN_LIMIT_EXCEEDED';
error.type = 'global' | 'per_user' | 'per_chat';
error.currentUsage = <number>;
error.limit = <number>;
throw error;
```

Error is caught by hook system and prevents LLM request.

### Database Errors

- Caught and logged in controllers
- Error messages returned to client
- Requests fail gracefully

### Hook Errors

- Hooks catch errors and log them
- Most hooks fail gracefully (don't interrupt chat flow)
- LLM_BEFORE_GENERATE errors block requests

---

## Configuration

### Database Configuration

**File:** `config/environments/development.json`

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

### Plugin Metadata

**File:** `plugin.json`

```json
{
  "name": "Token Analytics Plugin",
  "slug": "tokens-plugin",
  "version": "1.0.0",
  "description": "...",
  "author": "Bookbag Team",
  "entry": "index.js",
  "category": "analytics",
  "icon": "Activity",
  "priority": 35
}
```

### Context Initialization

**File:** `config/initializers/config.js`

```javascript
var master = require('mastercontroller');
var tokensContext = require(`${master.root}/bb-plugins/tokens-plugin/app/models/tokensContext`);
master.addSingleton("tokensContext", tokensContext);
```

---

## Testing

### Manual API Testing

```bash
# Get analytics
curl "http://localhost:8080/bb-tokens/api/tokens/analytics?period=daily"

# Get user stats
curl "http://localhost:8080/bb-tokens/api/tokens/user-stats"

# Get settings
curl "http://localhost:8080/bb-tokens/api/settings"

# Update settings (admin)
curl -X POST "http://localhost:8080/bb-tokens/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"per_user_token_limit": 50000, "per_user_limit_enabled": 1}'
```

### Database Testing

```javascript
const TokensContext = require('./app/models/tokensContext');
const context = new TokensContext();

// Count records
const count = await context.TokenUsage.where().toList().then(r => r.length);
console.log(`Total records: ${count}`);

// Check settings
const settings = await context.TokenSettings.where().single();
console.log('Settings:', settings);
```

---

## Troubleshooting

### Plugin Not Loading

**Symptoms:** Router logs don't show token routes

**Solutions:**
1. Check `plugin.json` syntax
2. Verify `index.js` exports correct functions
3. Check server logs for errors
4. Verify plugin is enabled in admin panel

### Hooks Not Firing

**Symptoms:** Token usage not being recorded

**Solutions:**
1. Verify hook names match exactly
2. Check hook handler files exist
3. Look for errors in console logs
4. Verify LLM response includes `usage` field

### Settings Not Persisting

**Symptoms:** Settings reset or not saving

**Solutions:**
1. Verify admin user role
2. Check database permissions
3. Verify TokenSettings table exists
4. Check for database errors in logs

### Database Issues

**Symptoms:** Database locked, query errors

**Solutions:**
1. Check database file permissions
2. Ensure no other processes accessing db
3. Run migrations: `masterrecord update-database tokens`
4. Check disk space

---

## Future Enhancements

1. **Per-model rate limiting** - Separate limits for different models
2. **Cost predictions** - Predict monthly costs based on usage trends
3. **User quotas** - Assign individual budgets to users
4. **Webhook notifications** - Send notifications to external services
5. **Advanced analytics** - Charts, graphs, trends
6. **Export functionality** - Download analytics as CSV/PDF
7. **Usage alerts** - Email/SMS alerts when approaching limits
8. **Historical reports** - Monthly/quarterly summary reports
9. **Multi-tenant support** - Per-tenant token limits
10. **Integration with billing system** - Automatic invoice generation

---

## Support & Documentation

- **Plugin Documentation:** See docs/ directory
- **API Reference:** docs/API.md
- **Database Schema:** docs/DATABASE.md
- **Main README:** README.md

