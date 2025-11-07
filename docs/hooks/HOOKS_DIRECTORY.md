# Bookbag Hooks Directory

> **Version:** 0.0.14
> **Last Updated:** November 5, 2024
> **Total Hooks:** 23

## Table of Contents

- [Overview](#overview)
- [Hook Categories](#hook-categories)
- [All Hooks Reference](#all-hooks-reference)
- [Usage Examples](#usage-examples)
- [Version History](#version-history)

---

## Overview

Bookbag uses a WordPress-style hook system that allows plugins to extend and modify functionality without changing core code. Hooks are divided into two types:

- **Action Hooks**: Execute custom code at specific points in the application lifecycle
- **Filter Hooks**: Modify data before it's used or displayed

---

## Hook Categories

### 🔧 System Hooks (5)
Core system lifecycle and initialization hooks

### 👤 User Hooks (5)
User authentication, registration, and profile management

### 💬 Chat Hooks (4)
Chat functionality and message processing

### 📄 Content Hooks (3)
Content creation, modification, and rendering

### 🔌 Plugin Hooks (3)
Plugin lifecycle and management

### 🖥️ Client/Frontend Hooks (3)
**NEW in v0.0.14** - Client-side component registration and UI customization

---

## All Hooks Reference

### System Hooks

#### `SYSTEM_INIT`
**Type:** Action
**Fires:** When the system initializes
**Use Case:** Initialize plugin services, connect to external APIs, setup cron jobs
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.SYSTEM_INIT, async (data) => {
  console.log('System initializing...');
  // Your initialization code
});
```

---

#### `SYSTEM_READY`
**Type:** Action
**Fires:** When all components are loaded and system is ready
**Use Case:** Start background tasks, verify connections, log system status
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.SYSTEM_READY, async (data) => {
  console.log('System ready!');
  // Your ready code
});
```

---

#### `SYSTEM_SHUTDOWN`
**Type:** Action
**Fires:** Before system shutdown
**Use Case:** Cleanup resources, close connections, save state
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.SYSTEM_SHUTDOWN, async (data) => {
  console.log('Shutting down...');
  // Your cleanup code
});
```

---

#### `SYSTEM_ERROR`
**Type:** Action
**Fires:** When system error occurs
**Use Case:** Log errors, send alerts, handle recovery
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.SYSTEM_ERROR, async (error) => {
  console.error('System error:', error);
  // Your error handling
});
```

---

#### `CONFIG_LOADED`
**Type:** Action
**Fires:** After configuration files are loaded
**Use Case:** Validate config, add dynamic config, override settings
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.CONFIG_LOADED, async (config) => {
  console.log('Config loaded:', config);
  // Your config customization
});
```

---

### User Hooks

#### `USER_REGISTERED`
**Type:** Action
**Fires:** After new user registration
**Use Case:** Send welcome email, create user profile, setup defaults
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.USER_REGISTERED, async (user) => {
  console.log('New user registered:', user.email);
  // Your registration handling
});
```

---

#### `USER_LOGIN`
**Type:** Action
**Fires:** After successful user login
**Use Case:** Log login activity, update last seen, check permissions
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.USER_LOGIN, async (user) => {
  console.log('User logged in:', user.email);
  // Your login handling
});
```

---

#### `USER_LOGOUT`
**Type:** Action
**Fires:** After user logout
**Use Case:** Clean up session data, log activity
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.USER_LOGOUT, async (user) => {
  console.log('User logged out:', user.email);
  // Your logout handling
});
```

---

#### `USER_UPDATED`
**Type:** Action
**Fires:** After user profile update
**Use Case:** Sync profile data, validate changes, send notifications
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.USER_UPDATED, async (user) => {
  console.log('User updated:', user.email);
  // Your update handling
});
```

---

#### `USER_DELETED`
**Type:** Action
**Fires:** Before user deletion
**Use Case:** Archive user data, remove associated records
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.USER_DELETED, async (user) => {
  console.log('User being deleted:', user.email);
  // Your deletion handling
});
```

---

### Chat Hooks

#### `CHAT_MESSAGE_SENT`
**Type:** Action
**Fires:** After chat message is sent
**Use Case:** Process message, trigger AI response, log activity
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.CHAT_MESSAGE_SENT, async (message) => {
  console.log('Message sent:', message.content);
  // Your message handling
});
```

---

#### `CHAT_MESSAGE_RECEIVED`
**Type:** Action
**Fires:** When chat message is received
**Use Case:** Display notification, update UI, process commands
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.CHAT_MESSAGE_RECEIVED, async (message) => {
  console.log('Message received:', message.content);
  // Your receive handling
});
```

---

#### `CHAT_CREATED`
**Type:** Action
**Fires:** After new chat/conversation created
**Use Case:** Initialize chat settings, setup defaults
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.CHAT_CREATED, async (chat) => {
  console.log('Chat created:', chat.id);
  // Your chat creation handling
});
```

---

#### `CHAT_DELETED`
**Type:** Action
**Fires:** Before chat/conversation deleted
**Use Case:** Archive chat data, cleanup resources
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.CHAT_DELETED, async (chat) => {
  console.log('Chat being deleted:', chat.id);
  // Your deletion handling
});
```

---

### Content Hooks

#### `CONTENT_CREATED`
**Type:** Action
**Fires:** After content is created
**Use Case:** Index content, send notifications, trigger workflows
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.CONTENT_CREATED, async (content) => {
  console.log('Content created:', content.id);
  // Your content handling
});
```

---

#### `CONTENT_UPDATED`
**Type:** Action
**Fires:** After content is updated
**Use Case:** Reindex content, invalidate cache, version tracking
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.CONTENT_UPDATED, async (content) => {
  console.log('Content updated:', content.id);
  // Your update handling
});
```

---

#### `CONTENT_DELETED`
**Type:** Action
**Fires:** Before content is deleted
**Use Case:** Archive content, cleanup references
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.CONTENT_DELETED, async (content) => {
  console.log('Content being deleted:', content.id);
  // Your deletion handling
});
```

---

### Plugin Hooks

#### `PLUGIN_LOADED`
**Type:** Action
**Fires:** After plugin is loaded
**Use Case:** Verify plugin dependencies, log plugin status
**Added:** v0.0.1

```javascript
hookService.addAction(HOOKS.PLUGIN_LOADED, async (plugin) => {
  console.log('Plugin loaded:', plugin.name);
  // Your plugin loading handling
});
```

---

#### `PLUGIN_ACTIVATED`
**Type:** Action
**Fires:** After plugin is activated
**Use Case:** Run setup tasks, create database tables, install dependencies
**Added:** v0.0.14

```javascript
hookService.addAction(HOOKS.PLUGIN_ACTIVATED, async (plugin) => {
  console.log('Plugin activated:', plugin.pluginName);
  // Your activation handling
});
```

---

#### `PLUGIN_DEACTIVATED`
**Type:** Action
**Fires:** After plugin is deactivated
**Use Case:** Cleanup resources, preserve data
**Added:** v0.0.14

```javascript
hookService.addAction(HOOKS.PLUGIN_DEACTIVATED, async (plugin) => {
  console.log('Plugin deactivated:', plugin.pluginName);
  // Your deactivation handling
});
```

---

### Client/Frontend Hooks

#### `CLIENT_SIDEBAR_LEFT` ⭐ NEW
**Type:** Component Registration
**Fires:** When client page renders (sidebar before main content)
**Use Case:** Register sidebar components that appear to the left of the main chat interface
**Added:** v0.0.14

```javascript
// In plugin load() method
registerClientComponent('MySidebarComponent', 'pages/client/MySidebar.js', {
  description: 'My custom sidebar',
  usage: 'sidebar-left',
  features: ['feature1', 'feature2']
});
```

**Location in UI:**
```
┌─────────────────────────────────────────┐
│  [SIDEBAR-LEFT]  │  Main Chat Content   │
│                  │                       │
└─────────────────────────────────────────┘
```

---

#### `CLIENT_SIDEBAR_RIGHT` ⭐ NEW
**Type:** Component Registration
**Fires:** When client page renders (sidebar after main content)
**Use Case:** Register sidebar components that appear to the right of the main chat interface
**Added:** v0.0.14

```javascript
// In plugin load() method
registerClientComponent('MyRightSidebar', 'pages/client/MyRightSidebar.js', {
  description: 'My right sidebar',
  usage: 'sidebar-right',
  features: ['notifications', 'quick-actions']
});
```

**Location in UI:**
```
┌─────────────────────────────────────────┐
│  Main Chat Content   │  [SIDEBAR-RIGHT] │
│                       │                  │
└─────────────────────────────────────────┘
```

---

#### `CLIENT_MENU` ⭐ NEW
**Type:** Component Registration
**Fires:** When client menu renders
**Use Case:** Register custom menu items in the client interface
**Added:** v0.0.14

```javascript
// In plugin load() method
registerClientComponent('MyMenuItem', 'pages/client/MyMenuItem.js', {
  description: 'My menu item',
  usage: 'client-menu',
  icon: 'settings',
  label: 'My Settings'
});
```

---

## Usage Examples

### Example 1: RAG Plugin Sidebar Registration

```javascript
// bb-plugins/rag-plugin/index.js
function load(pluginAPI) {
  const { registerClientComponent } = pluginAPI;

  // Register knowledge base sidebar (appears on left)
  registerClientComponent('KnowledgeBaseSidebar', 'pages/client/KnowledgeBaseSidebar.js', {
    description: 'Document management sidebar for chat interface',
    usage: 'sidebar-left',
    features: ['document-list', 'workspace-creation', 'document-upload', 'rag-settings']
  });
}
```

### Example 2: Plugin Activation Hook

```javascript
// bb-plugins/my-plugin/index.js
async function activate(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Fire activation hook
  await hookService.doAction(HOOKS.PLUGIN_ACTIVATED, {
    pluginName: 'my-plugin',
    version: '1.0.0'
  });

  return { success: true, message: 'Plugin activated!' };
}
```

### Example 3: Dynamic Sidebar Loading

```javascript
// Client component automatically loads all sidebar-left components
import { DynamicPluginSidebar } from '../_components/DynamicPluginSidebar';

export default function ChatPage() {
  return (
    <div className="flex">
      {/* Dynamically loads all sidebar-left components */}
      <DynamicPluginSidebar usage="sidebar-left" chatId={chatId} />

      <div className="flex-1">
        <ChatInterface />
      </div>

      {/* Dynamically loads all sidebar-right components */}
      <DynamicPluginSidebar usage="sidebar-right" chatId={chatId} />
    </div>
  );
}
```

---

## Version History

### v0.0.14 (November 5, 2024)

#### Added Hooks (3)
- `CLIENT_SIDEBAR_LEFT` - Client sidebar component registration (left position)
- `CLIENT_SIDEBAR_RIGHT` - Client sidebar component registration (right position)
- `CLIENT_MENU` - Client menu component registration

#### Enhanced Hooks (2)
- `PLUGIN_ACTIVATED` - Now fires during WordPress-style plugin activation
- `PLUGIN_DEACTIVATED` - Now fires during WordPress-style plugin deactivation

#### New Features
- WordPress-style plugin activation system
- Dynamic client component loading
- Self-contained plugin dependencies
- Plugin-specific database locations
- Enhanced masterrecord path detection for plugins

---

### v0.0.1 (Initial Release)

#### System Hooks (5)
- `SYSTEM_INIT`
- `SYSTEM_READY`
- `SYSTEM_SHUTDOWN`
- `SYSTEM_ERROR`
- `CONFIG_LOADED`

#### User Hooks (5)
- `USER_REGISTERED`
- `USER_LOGIN`
- `USER_LOGOUT`
- `USER_UPDATED`
- `USER_DELETED`

#### Chat Hooks (4)
- `CHAT_MESSAGE_SENT`
- `CHAT_MESSAGE_RECEIVED`
- `CHAT_CREATED`
- `CHAT_DELETED`

#### Content Hooks (3)
- `CONTENT_CREATED`
- `CONTENT_UPDATED`
- `CONTENT_DELETED`

#### Plugin Hooks (1)
- `PLUGIN_LOADED`

---

## Hook Implementation Details

### Where Hooks are Defined

All hooks are defined in: `components/plugins/app/core/hookConstants.js`

```javascript
const HOOKS = {
  // System hooks
  SYSTEM_INIT: 'system_init',
  SYSTEM_READY: 'system_ready',
  // ... more hooks

  // Client hooks (NEW in v0.0.14)
  CLIENT_SIDEBAR_LEFT: 'client_sidebar_left',
  CLIENT_SIDEBAR_RIGHT: 'client_sidebar_right',
  CLIENT_MENU: 'client_menu',
};
```

### Hook Service

The hook service manages all hook execution:
- **Location:** `components/plugins/app/core/hookService.js`
- **Methods:**
  - `addAction(hookName, callback)` - Register action hook
  - `doAction(hookName, data)` - Execute all callbacks for hook
  - `addFilter(hookName, callback)` - Register filter hook
  - `applyFilters(hookName, value)` - Apply all filters to value

---

## Best Practices

### 1. Hook Naming Convention
- Use descriptive names with category prefix
- Use SCREAMING_SNAKE_CASE for hook constants
- Use lowercase_snake_case for hook values

### 2. Always Clean Up
```javascript
// Store hook reference
const hookRef = hookService.addAction(HOOKS.SYSTEM_INIT, myCallback);

// Clean up on deactivation
function deactivate() {
  hookService.removeAction(HOOKS.SYSTEM_INIT, myCallback);
}
```

### 3. Async Hook Handlers
```javascript
hookService.addAction(HOOKS.USER_REGISTERED, async (user) => {
  await sendWelcomeEmail(user.email);
  await createUserProfile(user);
});
```

### 4. Error Handling
```javascript
hookService.addAction(HOOKS.CHAT_MESSAGE_SENT, async (message) => {
  try {
    await processMessage(message);
  } catch (error) {
    console.error('Error processing message:', error);
    // Don't throw - let other hooks continue
  }
});
```

---

## Related Documentation

- [Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)
- [Plugin Activation System](./PLUGIN_ACTIVATION_SYSTEM.md)
- [Dynamic Component Loading](./DYNAMIC_COMPONENT_LOADING.md)
- [Hook Service API](./HOOK_SERVICE_API.md)

---

**Need to add a new hook?**
1. Add to `hookConstants.js`
2. Update this documentation
3. Increment hook count in header
4. Add to version history
5. Create usage examples

---

**Questions or Issues?**
File an issue at: [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
