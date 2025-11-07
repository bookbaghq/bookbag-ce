# Bookbag Hooks System Reference

**Version**: 1.0.0
**Last Updated**: November 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Hook Types](#hook-types)
4. [Available Hooks](#available-hooks)
5. [Usage Guide](#usage-guide)
6. [Integration Points](#integration-points)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## Overview

The Bookbag Hooks System is a WordPress-style plugin architecture that allows developers to extend and modify Bookbag functionality without modifying core code. It provides 21 core hooks across 4 categories:

- **Core Lifecycle Hooks** (3): System initialization and shutdown
- **Admin Hooks** (5): Admin panel customization
- **Chat/Pipeline Hooks** (5): Message processing and LLM integration
- **Frontend Client Hooks** (3): Client UI customization
- **System/Developer Hooks** (4): Plugin management and routing

---

## Core Concepts

### Actions vs Filters

**Actions** execute callbacks without returning a value:
```javascript
// Action: Do something when hook fires
hookService.addAction('bookbag_init', async (context) => {
  console.log('System initializing...');
}, 10);

// Fire the action
await hookService.doAction('bookbag_init', { environment: 'production' });
```

**Filters** modify data and return it:
```javascript
// Filter: Modify data as it passes through
hookService.addFilter('chat_before_message', async (data) => {
  // Add custom validation
  if (!data.userId) {
    data.cancelled = true;
  }
  return data;
}, 10);

// Apply filters and get modified data
const result = await hookService.applyFilters('chat_before_message', {
  userId: 123,
  message: 'Hello'
});
```

### Hook Priority

Hooks execute in priority order (lowest number first, default: 10):

```javascript
hookService.addAction('bookbag_init', callback1, 5);  // Runs first
hookService.addAction('bookbag_init', callback2, 10); // Runs second
hookService.addAction('bookbag_init', callback3, 20); // Runs third
```

---

## Hook Types

| Type | Method | Returns | Use Case |
|------|--------|---------|----------|
| **Action** | `doAction()` | void | Execute side effects (logging, notifications, etc.) |
| **Filter** | `applyFilters()` | modified value | Transform data (validation, enrichment, etc.) |

---

## Available Hooks

### 1. Core Lifecycle Hooks

#### `bookbag_init`
**Type**: Action
**When**: Early in system initialization, before plugins are loaded
**Context**:
```javascript
{
  master: MasterController,
  environment: string // e.g., 'development', 'production'
}
```

**Use Cases**:
- Initialize database connections
- Load configuration
- Set up core services

**Example**:
```javascript
hookService.addAction(HOOKS.CORE_INIT, async (context) => {
  console.log(`🚀 System initializing in ${context.environment} mode`);
  // Initialize your plugin's core services
}, 10);
```

---

#### `bookbag_ready`
**Type**: Action
**When**: After all plugins are loaded and system is ready
**Context**:
```javascript
{
  master: MasterController,
  pluginLoader: PluginLoader,
  loadedPlugins: string[] // Array of loaded plugin paths
}
```

**Use Cases**:
- Register routes
- Start background services
- Verify plugin dependencies

**Example**:
```javascript
hookService.addAction(HOOKS.CORE_READY, async (context) => {
  console.log(`✅ System ready! ${context.loadedPlugins.length} plugins loaded`);
  // Start your plugin's services
}, 10);
```

---

#### `bookbag_shutdown`
**Type**: Action
**When**: Graceful shutdown (SIGTERM/SIGINT)
**Context**:
```javascript
{
  master: MasterController
}
```

**Use Cases**:
- Close database connections
- Save state
- Clean up resources

**Example**:
```javascript
hookService.addAction(HOOKS.CORE_SHUTDOWN, async (context) => {
  console.log('📴 Shutting down plugin gracefully...');
  // Close connections, save state
}, 10);
```

---

### 2. Admin Hooks

#### `admin_menu`
**Type**: Action
**When**: Admin sidebar is being rendered
**Context**:
```javascript
{
  menu: Array,           // Array of menu items
  submenu: Object,       // Object of submenu arrays by parent ID
  context: {
    req: Request,
    res: Response,
    user: User,
    tenant: Tenant,
    tenantId: string
  },
  addMenuItem: (item) => void,          // Helper to add menu item
  addSubmenuItem: (parentId, item) => void  // Helper to add submenu item
}
```

**Use Cases**:
- Add custom admin pages
- Add settings pages
- Add plugin management pages

**Example**:
```javascript
hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
  // Add a top-level menu item
  context.addMenuItem({
    id: 'my-plugin',
    label: 'My Plugin',
    url: '/bb-admin/my-plugin',
    icon: 'Settings',
    position: 100
  });

  // Add submenu items
  context.addSubmenuItem('my-plugin', {
    label: 'Settings',
    url: '/bb-admin/my-plugin/settings'
  });
}, 10);
```

---

#### `admin_view_render`
**Type**: Filter
**When**: Before admin view is rendered
**Context**: View data object

**Use Cases**:
- Inject content into admin pages
- Add notices/warnings
- Modify page data

---

#### `admin_register_view`
**Type**: Action
**When**: Admin views are being registered

**Use Cases**:
- Register custom admin pages dynamically
- Add custom routes

---

#### `admin_enqueue`
**Type**: Action
**When**: Admin page is loading

**Use Cases**:
- Add custom CSS/JS to admin panel
- Load external libraries

---

#### `admin_toolbar`
**Type**: Filter
**When**: Admin toolbar is being rendered

**Use Cases**:
- Add toolbar buttons
- Add status indicators
- Add quick actions

---

### 3. Chat/Pipeline Hooks

#### `chat_before_message`
**Type**: Filter
**When**: Before user message is processed
**Context**:
```javascript
{
  userId: number,
  chatId: number,
  modelId: number,
  userMessageId: number,
  formData: Object,
  cancelled: boolean  // Set to true to cancel processing
}
```

**Use Cases**:
- Message validation
- Content moderation
- Rate limiting
- Access control

**Example**:
```javascript
hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
  // Moderate message content
  if (containsProfanity(data.formData.message)) {
    console.warn('🚫 Message blocked: profanity detected');
    data.cancelled = true;
  }
  return data;
}, 10);
```

---

#### `chat_after_message`
**Type**: Action
**When**: After user message is saved to database
**Context**:
```javascript
{
  message: Message,
  userId: number,
  chatId: number,
  messageId: number
}
```

**Use Cases**:
- Logging/analytics
- Triggering workflows
- Sending notifications

**Example**:
```javascript
hookService.addAction(HOOKS.CHAT_AFTER_MESSAGE, async (context) => {
  console.log(`📨 Message ${context.messageId} saved to chat ${context.chatId}`);
  // Log to analytics service
}, 10);
```

---

#### `llm_before_generate`
**Type**: Filter
**When**: Before sending prompt to LLM
**Context**:
```javascript
{
  prompt: string,
  messages: Array,
  model: Object,
  settings: Object
}
```

**Use Cases**:
- **RAG injection** (add knowledge base context)
- Prompt modification
- Context enhancement
- System prompt injection

**Example**:
```javascript
hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, async (data) => {
  // Inject RAG context
  const relevantDocs = await searchKnowledgeBase(data.prompt);
  if (relevantDocs.length > 0) {
    data.messages.unshift({
      role: 'system',
      content: `Use this context: ${relevantDocs.join('\n')}`
    });
  }
  return data;
}, 10);
```

---

#### `llm_after_generate`
**Type**: Filter
**When**: After LLM returns response, before saving
**Context**:
```javascript
{
  response: string,
  prompt: string,
  model: Object,
  metadata: Object
}
```

**Use Cases**:
- **Content moderation** (filter LLM output)
- Response formatting
- Adding citations
- Response validation

**Example**:
```javascript
hookService.addFilter(HOOKS.LLM_AFTER_GENERATE, async (data) => {
  // Moderate LLM response
  if (containsSensitiveInfo(data.response)) {
    data.response = '[REDACTED: Sensitive information detected]';
  }
  return data;
}, 10);
```

---

#### `chat_response_final`
**Type**: Filter
**When**: Final chat response ready to send to client
**Context**:
```javascript
{
  response: string,
  chatId: number,
  messageId: number,
  metadata: Object
}
```

**Use Cases**:
- Final formatting
- Adding metadata
- Logging final output

---

### 4. Frontend Client Hooks

#### `client_sidebar`
**Type**: Filter
**When**: Client sidebar is being rendered
**Context**:
```javascript
{
  menuItems: Array,
  currentUser: User
}
```

**Use Cases**:
- Add custom sidebar items
- Modify navigation
- Add widgets

---

#### `client_toolbar`
**Type**: Filter
**When**: Client toolbar is being rendered
**Context**:
```javascript
{
  toolbarItems: Array,
  currentChat: Chat
}
```

**Use Cases**:
- Add toolbar buttons
- Add dropdowns
- Add status indicators

---

#### `client_widget_render`
**Type**: Action
**When**: Client UI is initializing

**Use Cases**:
- Register custom UI widgets
- Add chat enhancements

---

### 5. System/Developer Hooks

#### `plugin_loaded`
**Type**: Action
**When**: A plugin is successfully loaded
**Context**:
```javascript
{
  pluginName: string,
  pluginPath: string,
  pluginMetadata: Object
}
```

**Use Cases**:
- Plugin initialization tracking
- Dependency verification
- Load dependent plugins

---

#### `plugin_activated`
**Type**: Action
**When**: A plugin is activated
**Context**:
```javascript
{
  pluginName: string,
  pluginMetadata: Object
}
```

**Use Cases**:
- Run setup tasks
- Database migrations
- Create default settings

---

#### `plugin_deactivated`
**Type**: Action
**When**: A plugin is deactivated
**Context**:
```javascript
{
  pluginName: string,
  pluginMetadata: Object
}
```

**Use Cases**:
- Cleanup
- Remove hooks
- Disable features

---

#### `routes_registered`
**Type**: Action
**When**: Plugin routes are being registered
**Context**:
```javascript
{
  router: Router,
  app: Express
}
```

**Use Cases**:
- Register custom API endpoints
- Add custom web routes

---

## Usage Guide

### Basic Plugin Structure

```javascript
// bb-plugins/my-plugin/index.js
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Register hooks
  hookService.addAction(HOOKS.CORE_INIT, async (context) => {
    console.log('My plugin initializing...');
  });

  hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
    // Modify message data
    return data;
  });
}

module.exports = { load };
```

### Accessing Hooks in Plugins

Plugins receive the `pluginAPI` object with:
- `hookService`: Hook registration service
- `HOOKS`: Hook constants
- `pluginLoader`: Plugin loader instance
- `sidebarHook`: Legacy sidebar hook (for compatibility)

### Removing Hooks

```javascript
// Save callback reference
const myCallback = async (data) => { /* ... */ };

// Add hook
hookService.addAction(HOOKS.CORE_INIT, myCallback);

// Remove hook later
hookService.removeAction(HOOKS.CORE_INIT, myCallback);
```

---

## Integration Points

### Server Startup
**File**: `/config/initializers/config.js`
- Initializes hook system
- Fires `bookbag_init` (line 81)
- Loads plugins (line 92)
- Fires `bookbag_ready` (line 96)
- Registers shutdown handlers (line 107, 114)

### Admin Sidebar
**File**: `/components/admin/app/controllers/api/layout/sidebarController.js`
- Fires `admin_menu` hook (line 69)
- Allows plugins to add menu items

### Chat Pipeline
**File**: `/app/sockets/chatSocket.js`
- Integration points identified:
  - Line ~160: `chat_before_message` (before processing)
  - Line ~228: `chat_after_message` (after save)
  - Line ~460: `llm_before_generate` (before LLM call)
  - Line ~467: `llm_after_generate` (after LLM response)
  - Line ~575: `chat_response_final` (before client send)

### Plugin Loader
**File**: `/components/plugins/app/core/pluginLoader.js`
- Fires `plugin_loaded` hook (line 121)
- Passes HOOKS constants to plugins (line 111)

---

## Best Practices

### 1. **Always Use Hook Constants**
```javascript
// ✅ Good
hookService.addAction(HOOKS.CORE_INIT, callback);

// ❌ Bad
hookService.addAction('bookbag_init', callback);
```

### 2. **Handle Errors Gracefully**
```javascript
hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
  try {
    // Your logic
    return data;
  } catch (error) {
    console.error('Hook error:', error);
    return data; // Return original data on error
  }
});
```

### 3. **Use Appropriate Priorities**
- Core functionality: 1-5
- Normal plugins: 10 (default)
- UI modifications: 15-20
- Logging/analytics: 90-100

### 4. **Validate Filter Returns**
Always return the data object (or modified version) from filters:
```javascript
hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
  // Modify data
  data.validated = true;

  // Always return data
  return data;
});
```

### 5. **Document Your Hooks**
Always document which hooks your plugin uses:
```javascript
/**
 * My Plugin
 *
 * Hooks Used:
 * - bookbag_init (action): Initialize plugin
 * - chat_before_message (filter): Validate messages
 * - admin_menu (action): Add admin page
 */
function load(pluginAPI) {
  // ...
}
```

---

## Examples

### Example 1: RAG Plugin

```javascript
// bb-plugins/rag-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Inject RAG context before LLM generation
  hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, async (data) => {
    const userQuestion = data.messages[data.messages.length - 1].content;

    // Search knowledge base
    const relevantDocs = await searchKnowledgeBase(userQuestion);

    if (relevantDocs.length > 0) {
      // Inject context
      data.messages.unshift({
        role: 'system',
        content: `Knowledge Base Context:\n${relevantDocs.join('\n')}`
      });
    }

    return data;
  }, 10);
}

module.exports = { load };
```

### Example 2: Moderation Plugin

```javascript
// bb-plugins/moderation-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Moderate input messages
  hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
    if (await containsProfanity(data.formData.message)) {
      console.warn(`🚫 Blocked message from user ${data.userId}`);
      data.cancelled = true;
    }
    return data;
  }, 5); // High priority

  // Moderate LLM output
  hookService.addFilter(HOOKS.LLM_AFTER_GENERATE, async (data) => {
    if (await containsSensitiveInfo(data.response)) {
      data.response = '[Content moderated]';
    }
    return data;
  }, 5); // High priority
}

module.exports = { load };
```

### Example 3: Analytics Plugin

```javascript
// bb-plugins/analytics-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Log all messages
  hookService.addAction(HOOKS.CHAT_AFTER_MESSAGE, async (context) => {
    await logToAnalytics({
      event: 'message_sent',
      userId: context.userId,
      chatId: context.chatId,
      timestamp: Date.now()
    });
  }, 100); // Low priority (run last)

  // Track LLM usage
  hookService.addAction(HOOKS.LLM_AFTER_GENERATE, async (context) => {
    await logToAnalytics({
      event: 'llm_generation',
      model: context.model.name,
      tokens: context.metadata.tokens,
      timestamp: Date.now()
    });
  }, 100); // Low priority
}

module.exports = { load };
```

---

## Debugging

### View Hook Statistics

```javascript
const hookService = master.requestList.hookService;
const stats = hookService.getHookStats();
console.log(JSON.stringify(stats, null, 2));
```

Output:
```json
{
  "registeredHooks": 21,
  "activeActions": 5,
  "activeFilters": 3,
  "totalActionCallbacks": 8,
  "totalFilterCallbacks": 5,
  "actions": [
    { "name": "bookbag_init", "callbacks": 2, "priorities": [5, 10] }
  ],
  "filters": [
    { "name": "chat_before_message", "callbacks": 3, "priorities": [5, 10, 15] }
  ]
}
```

### Check if Hook is Active

```javascript
if (hookService.hasAction('bookbag_init')) {
  console.log('bookbag_init hook has callbacks registered');
}

if (hookService.hasFilter('chat_before_message')) {
  console.log('chat_before_message filter has callbacks registered');
}
```

---

## Migration from Legacy Hooks

If you're migrating from the old sidebarHook system:

### Before (Legacy):
```javascript
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  sidebarHook.add_menu_page({
    label: 'My Plugin',
    url: '/bb-admin/my-plugin'
  });
}
```

### After (Generic Hooks):
```javascript
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      url: '/bb-admin/my-plugin',
      icon: 'Settings'
    });
  });
}
```

---

## API Reference

### HookService Methods

| Method | Description |
|--------|-------------|
| `addAction(hookName, callback, priority)` | Register action hook |
| `addFilter(hookName, callback, priority)` | Register filter hook |
| `removeAction(hookName, callback)` | Remove action hook |
| `removeFilter(hookName, callback)` | Remove filter hook |
| `doAction(hookName, context)` | Fire action hook |
| `applyFilters(hookName, value, ...args)` | Apply filters |
| `hasAction(hookName)` | Check if action has callbacks |
| `hasFilter(hookName)` | Check if filter has callbacks |
| `getHookStats()` | Get hook statistics |

---

## Support

For questions or issues with the hooks system:
- **Documentation**: `/docs/hooks/`
- **Examples**: `/bb-plugins/`
- **Source Code**: `/components/plugins/app/core/`

---

**Built with ❤️ for the Bookbag Community**
