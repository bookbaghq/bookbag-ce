# Plugin API Reference

Complete API reference for BookBag plugin development.

## Table of Contents

- [Plugin Structure](#plugin-structure)
- [Plugin API Object](#plugin-api-object)
- [Sidebar Hook API](#sidebar-hook-api)
- [Hook Service API](#hook-service-api)
- [Database Context API](#database-context-api)
- [Utility Functions](#utility-functions)
- [Type Definitions](#type-definitions)

## Plugin Structure

### Module Exports

Every plugin must export a `load` function:

```typescript
interface PluginModule {
  load: (pluginAPI: PluginAPI) => void;
  unload?: () => void;
}
```

**Example:**
```javascript
function load(pluginAPI) {
  // Plugin initialization
}

function unload() {
  // Plugin cleanup (optional)
}

module.exports = { load, unload };
```

### Load Function

The main entry point for your plugin.

**Signature:**
```javascript
function load(pluginAPI: PluginAPI): void
```

**Parameters:**
- `pluginAPI` - Object containing plugin API components

**Example:**
```javascript
function load(pluginAPI) {
  const { sidebarHook, hookService, pluginLoader } = pluginAPI;

  // Initialize plugin
  console.log('Plugin loading...');

  // Register hooks and menus
  registerMenus(sidebarHook);
  registerHooks(hookService);

  console.log('Plugin loaded');
}
```

### Unload Function (Optional)

Called when plugin is deactivated or server shuts down.

**Signature:**
```javascript
function unload(): void
```

**Example:**
```javascript
function unload() {
  console.log('Plugin unloading...');

  // Cleanup
  clearTimeouts();
  closeConnections();
  saveState();

  console.log('Plugin unloaded');
}
```

## Plugin API Object

### PluginAPI Interface

```typescript
interface PluginAPI {
  sidebarHook: SidebarHook;
  hookService: HookService | null;
  pluginLoader: PluginLoader;
}
```

### Accessing API Components

```javascript
function load(pluginAPI) {
  // Destructure API components
  const { sidebarHook, hookService, pluginLoader } = pluginAPI;

  // Check if hookService is available
  if (hookService) {
    // Use hook service
  }

  // Use sidebar hook
  sidebarHook.onAdminMenu(async (context) => {
    // Add menus
  });
}
```

## Sidebar Hook API

### SidebarHook Interface

```typescript
interface SidebarHook {
  onAdminMenu(callback: AdminMenuCallback): void;
  add_menu_page(options: MenuPageOptions): void;
  add_submenu_page(parentId: string, options: SubmenuPageOptions): void;
}
```

### onAdminMenu

Register a callback for building admin menu.

**Signature:**
```typescript
onAdminMenu(callback: AdminMenuCallback): void

type AdminMenuCallback = (context: MenuContext) => Promise<void>
```

**Context Interface:**
```typescript
interface MenuContext {
  req: Request;          // Express request with contexts
  res: Response;         // Express response
  user: User;            // Current user object
  tenant: Tenant;        // Current tenant object
  tenantId: string;      // Current tenant ID
}
```

**Example:**
```javascript
sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
  // Access database contexts
  const userContext = req.userContext;
  const chatContext = req.chatContext;

  // Query data
  const userCount = userContext.User.all().length;

  // Add menus based on data
  sidebarHook.add_menu_page({
    id: 'users',
    label: `Users (${userCount})`,
    icon: 'Users',
    capability: 'administrator',
    priority: 20
  });
});
```

### add_menu_page

Add a top-level menu item.

**Signature:**
```typescript
add_menu_page(options: MenuPageOptions): void
```

**Options Interface:**
```typescript
interface MenuPageOptions {
  id: string;           // Unique identifier (required)
  label: string;        // Display text (required)
  icon: string;         // Lucide icon name (required)
  capability: string;   // 'read' or 'administrator' (required)
  priority: number;     // Menu order, lower = higher (required)
  render?: any;         // Reserved for future use
}
```

**Example:**
```javascript
sidebarHook.add_menu_page({
  id: 'analytics',
  label: 'Analytics',
  icon: 'BarChart',
  capability: 'administrator',
  priority: 40,
  render: null
});
```

**Available Icons:**
Common Lucide icons:
- Navigation: `Home`, `Menu`, `Search`, `Settings`
- Content: `FileText`, `File`, `Folder`, `Archive`
- Users: `User`, `Users`, `UserPlus`, `UserCheck`
- Communication: `MessageSquare`, `Mail`, `Send`, `Inbox`
- Media: `Image`, `Video`, `Music`, `Film`
- Interface: `Grid`, `List`, `Layout`, `Layers`
- Actions: `Plus`, `Edit`, `Trash2`, `Download`, `Upload`
- Status: `Check`, `X`, `AlertCircle`, `Info`
- Analytics: `BarChart`, `PieChart`, `TrendingUp`, `Activity`
- System: `Database`, `Server`, `Cloud`, `Shield`, `Lock`
- Other: `Star`, `Heart`, `Bookmark`, `Tag`, `Package`, `Zap`

[Full icon list at Lucide.dev](https://lucide.dev/icons/)

### add_submenu_page

Add a submenu item under a parent menu.

**Signature:**
```typescript
add_submenu_page(parentId: string, options: SubmenuPageOptions): void
```

**Options Interface:**
```typescript
interface SubmenuPageOptions {
  id: string;           // Unique identifier (required)
  label: string;        // Display text (required)
  path: string;         // URL path (required)
  capability: string;   // 'read' or 'administrator' (required)
  priority: number;     // Submenu order, lower = higher (required)
}
```

**Example:**
```javascript
sidebarHook.add_submenu_page('analytics', {
  id: 'analytics-overview',
  label: 'Overview',
  path: 'bb-admin/analytics/overview',
  capability: 'administrator',
  priority: 5
});

sidebarHook.add_submenu_page('analytics', {
  id: 'analytics-reports',
  label: 'Reports',
  path: 'bb-admin/analytics/reports',
  capability: 'administrator',
  priority: 10
});
```

**Path Format:**
- Relative to domain root
- No leading slash
- Format: `bb-admin/section/page`
- Examples:
  - `bb-admin/users/list`
  - `bb-admin/settings/general`
  - `bb-admin/reports/tokens`

## Hook Service API

### HookService Interface

```typescript
interface HookService {
  addFilter(name: string, callback: FilterCallback): void;
  addAction(name: string, callback: ActionCallback): void;
  applyFilters(name: string, value: any, ...args: any[]): any;
  doAction(name: string, ...args: any[]): void;
}
```

### addFilter

Register a filter to modify data.

**Signature:**
```typescript
addFilter(name: string, callback: FilterCallback): void

type FilterCallback = (value: any, ...args: any[]) => any
```

**Parameters:**
- `name` - Filter name
- `callback` - Function that modifies and returns value

**Example:**
```javascript
hookService.addFilter('chat_message', (message, user, chat) => {
  // Modify message
  message.timestamp = Date.now();
  message.user_name = user.first_name;

  // Must return modified value
  return message;
});
```

**Important:**
- **Always return the value** (even if unchanged)
- Filters must be synchronous (no async/await)
- Return `false` to cancel operation (if supported by hook)

### addAction

Register an action to execute code on events.

**Signature:**
```typescript
addAction(name: string, callback: ActionCallback): void

type ActionCallback = (...args: any[]) => void
```

**Parameters:**
- `name` - Action name
- `callback` - Function to execute (no return value)

**Example:**
```javascript
hookService.addAction('after_chat_create', (chat, user) => {
  // Execute action
  console.log(`Chat created: ${chat.title}`);

  // Send notification
  notifyUser(user, `Your chat "${chat.title}" was created`);

  // Log to analytics
  logAnalytics('chat_created', {
    chat_id: chat.id,
    user_id: user.id
  });

  // No return value
});
```

**Important:**
- Actions don't return values
- Can be synchronous or asynchronous
- Errors should be caught and handled

### applyFilters

Apply filters to a value (for custom hooks).

**Signature:**
```typescript
applyFilters(name: string, value: any, ...args: any[]): any
```

**Parameters:**
- `name` - Filter name
- `value` - Value to filter
- `...args` - Additional arguments passed to filter callbacks

**Returns:** Filtered value

**Example:**
```javascript
// In your plugin code
const processData = (data) => {
  // Apply custom filter
  const filteredData = hookService.applyFilters('my_plugin_data', data, 'additional', 'args');

  return filteredData;
};

// Other plugins can hook into this
hookService.addFilter('my_plugin_data', (data, arg1, arg2) => {
  data.modified = true;
  return data;
});
```

### doAction

Execute action hooks (for custom hooks).

**Signature:**
```typescript
doAction(name: string, ...args: any[]): void
```

**Parameters:**
- `name` - Action name
- `...args` - Arguments passed to action callbacks

**Example:**
```javascript
// In your plugin code
const completeTask = (task) => {
  // Do work
  const result = performTask(task);

  // Fire custom action
  hookService.doAction('my_plugin_task_complete', result, task);

  return result;
};

// Other plugins can hook into this
hookService.addAction('my_plugin_task_complete', (result, task) => {
  console.log('Task completed:', task.name);
  logToAnalytics(result);
});
```

## Database Context API

### Accessing Contexts

Database contexts are available in the `onAdminMenu` callback via `req` object.

```javascript
sidebarHook.onAdminMenu(async ({ req }) => {
  // Available contexts
  const userContext = req.userContext;
  const chatContext = req.chatContext;
  const modelContext = req.modelContext;
  const ragContext = req.ragContext;
  const workspaceContext = req.workspaceContext;
  const mediaContext = req.mediaContext;
  const adminContext = req.adminContext;
});
```

### Context Interface

Each context provides access to models via MasterRecord ORM.

```typescript
interface Context {
  [ModelName]: ModelCollection;
  saveChanges(): void;
}

interface ModelCollection {
  all(): Model[];
  find(id: number): Model | null;
  first(): Model | null;
  single(): Model | null;
  where(predicate: (model: Model) => boolean): Model[];
  add(model: Model): void;
  remove(model: Model): void;
}
```

### Query Methods

**all() - Get all records:**
```javascript
const users = userContext.User.all();
console.log(`Total users: ${users.length}`);
```

**find(id) - Find by primary key:**
```javascript
const user = userContext.User.find(userId);
if (user) {
  console.log(user.email);
}
```

**first() - Get first record:**
```javascript
const firstChat = chatContext.Chat.first();
```

**single() - Get singleton record:**
```javascript
// For tables with only one record
const settings = adminContext.Setting.single();
```

**where(predicate) - Filter records:**
```javascript
const activeUsers = userContext.User.where(user =>
  user.is_active === 1
);

const userChats = chatContext.Chat.where(chat =>
  chat.user_id === currentUser.id && chat.deleted_at === null
);
```

### Mutation Methods

**add(model) - Create record:**
```javascript
const User = require('../../components/user/app/models/user');
const newUser = new User();
newUser.email = 'newuser@example.com';
newUser.first_name = 'John';
newUser.last_name = 'Doe';
newUser.created_at = Date.now().toString();

userContext.User.add(newUser);
userContext.saveChanges();
```

**remove(model) - Delete record:**
```javascript
const user = userContext.User.find(userId);
if (user) {
  userContext.User.remove(user);
  userContext.saveChanges();
}
```

**Update - Modify existing record:**
```javascript
const user = userContext.User.find(userId);
if (user) {
  user.first_name = 'Updated Name';
  user.updated_at = Date.now().toString();
  userContext.saveChanges();
}
```

**saveChanges() - Persist changes:**
```javascript
// Add multiple records
userContext.User.add(user1);
userContext.User.add(user2);

// Update records
existingUser.email = 'new@example.com';

// Delete records
userContext.User.remove(userToDelete);

// Persist all changes
userContext.saveChanges();
```

### Relationships

**belongsTo - Get parent:**
```javascript
const message = chatContext.Message.find(messageId);
const chat = message.Chat(); // Get parent chat
const user = message.User(); // Get author
```

**hasMany - Get children:**
```javascript
const chat = chatContext.Chat.find(chatId);
const messages = chat.Messages(); // Get all messages
```

## Utility Functions

### Logging

```javascript
// Console logging
console.log('Info message');
console.warn('Warning message');
console.error('Error message');

// Structured logging
console.log('[PluginName]', 'Message', { data: 'value' });
```

### Error Handling

```javascript
function load(pluginAPI) {
  try {
    // Plugin logic
    registerMenus(pluginAPI.sidebarHook);
  } catch (error) {
    console.error('Plugin error:', error);
    // Don't throw - let other plugins load
  }
}
```

### Async Operations

```javascript
sidebarHook.onAdminMenu(async ({ req }) => {
  try {
    // Async database queries work
    const users = await asyncQuery();

    // But keep it fast
    sidebarHook.add_menu_page({
      id: 'users',
      label: `Users (${users.length})`,
      icon: 'Users',
      capability: 'read',
      priority: 20
    });
  } catch (error) {
    console.error('Error loading users:', error);
  }
});
```

## Type Definitions

### User Object

```typescript
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  password: string;          // Hashed
  role: 'administrator' | 'subscriber';
  is_active: number;         // 1 or 0
  created_at: string;        // Timestamp
  updated_at: string;        // Timestamp
  deleted_at: string | null; // Timestamp or null
}
```

### Chat Object

```typescript
interface Chat {
  id: number;
  user_id: number;
  workspace_id: number | null;
  title: string;
  is_archived: number;       // 1 or 0
  is_favorite: number;       // 1 or 0
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

### Message Object

```typescript
interface Message {
  id: number;
  chat_id: number;
  model_id: number;
  role: 'user' | 'assistant';
  content: string;
  thinking: string | null;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}
```

### Model Object

```typescript
interface Model {
  id: number;
  name: string;
  provider: string;          // 'openai', 'anthropic', 'grok'
  model_string: string;
  system_prompt: string;
  is_published: number;      // 1 or 0
  supports_vision: number;   // 1 or 0
  supports_generation: number; // 1 or 0
  max_tokens: number;
  temperature: number;
  profile_id: number | null;
  created_at: string;
  updated_at: string;
}
```

### Workspace Object

```typescript
interface Workspace {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

### Document Object

```typescript
interface Document {
  id: number;
  user_id: number;
  workspace_id: number | null;
  chat_id: number | null;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
}
```

## Complete Plugin Example

```javascript
/**
 * Analytics Plugin
 * Adds analytics dashboard and reports to admin menu
 */

const MasterRecord = require('masterrecord');

// Plugin metadata
const PLUGIN_NAME = 'analytics-plugin';
const PLUGIN_VERSION = '1.0.0';

/**
 * Load function - plugin entry point
 * @param {Object} pluginAPI - Plugin API object
 */
function load(pluginAPI) {
  try {
    const { sidebarHook, hookService } = pluginAPI;

    console.log(`[${PLUGIN_NAME}] Loading v${PLUGIN_VERSION}...`);

    // Register menus
    registerMenus(sidebarHook);

    // Register hooks
    if (hookService) {
      registerHooks(hookService);
    }

    console.log(`[${PLUGIN_NAME}] Loaded successfully`);
  } catch (error) {
    console.error(`[${PLUGIN_NAME}] Error loading:`, error);
  }
}

/**
 * Register sidebar menus
 */
function registerMenus(sidebarHook) {
  sidebarHook.onAdminMenu(async ({ req, user }) => {
    // Only show to administrators
    if (user.role !== 'administrator') {
      return;
    }

    // Get analytics data
    const chatContext = req.chatContext;
    const totalChats = chatContext.Chat.all().length;

    // Add top-level menu
    sidebarHook.add_menu_page({
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart',
      capability: 'administrator',
      priority: 40
    });

    // Add submenus
    sidebarHook.add_submenu_page('analytics', {
      id: 'analytics-overview',
      label: 'Overview',
      path: 'bb-admin/analytics/overview',
      capability: 'administrator',
      priority: 5
    });

    sidebarHook.add_submenu_page('analytics', {
      id: 'analytics-chats',
      label: `Chats (${totalChats})`,
      path: 'bb-admin/analytics/chats',
      capability: 'administrator',
      priority: 10
    });

    sidebarHook.add_submenu_page('analytics', {
      id: 'analytics-tokens',
      label: 'Token Usage',
      path: 'bb-admin/analytics/tokens',
      capability: 'administrator',
      priority: 15
    });
  });
}

/**
 * Register hooks and filters
 */
function registerHooks(hookService) {
  // Log when chats are created
  hookService.addAction('after_chat_create', (chat, user) => {
    console.log(`[${PLUGIN_NAME}] Chat created:`, {
      chat_id: chat.id,
      user_id: user.id,
      title: chat.title
    });
  });

  // Add analytics metadata to messages
  hookService.addFilter('after_message_receive', (response, message, chat, model) => {
    response.analytics = {
      plugin: PLUGIN_NAME,
      tracked_at: Date.now(),
      model_name: model.name
    };

    return response;
  });
}

/**
 * Unload function - cleanup
 */
function unload() {
  console.log(`[${PLUGIN_NAME}] Unloading...`);
  // Cleanup if needed
}

// Export plugin
module.exports = { load, unload };
```

## Related Documentation

- [Plugin Development Guide](PLUGIN_DEVELOPMENT.md) - How to create plugins
- [Hooks Reference](HOOKS_REFERENCE.md) - Available hooks
- [Developer Guide](../DEVELOPER_GUIDE.md) - General development
- [Architecture](../ARCHITECTURE.md) - System architecture
