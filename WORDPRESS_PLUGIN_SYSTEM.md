# Bookbag WordPress-Style Plugin System

> **📌 Note:** This document has been superseded by comprehensive documentation in `docs/hooks/`
>
> **🔗 See:** [Complete Hooks & Plugin Documentation](./docs/hooks/README.md)

---

## Overview

The Bookbag Plugin System is a comprehensive WordPress-inspired hooks architecture that allows developers to extend Bookbag functionality without modifying core code.

**Status**: ✅ **Production Ready**
**Version**: 0.0.14
**Architecture**: WordPress-style Actions, Filters, and Component Registration
**Last Updated**: November 5, 2024

---

## 🆕 What's New in v0.0.14

### New Features
- ✅ **WordPress-Style Activation System** - `activate()` and `deactivate()` methods
- ✅ **Self-Contained Plugins** - Each plugin can have its own `package.json` and `node_modules/`
- ✅ **Dynamic Component Loading** - No hardcoded imports for client components
- ✅ **3 New Client Hooks** - `CLIENT_SIDEBAR_LEFT`, `CLIENT_SIDEBAR_RIGHT`, `CLIENT_MENU`
- ✅ **Plugin-Specific Databases** - Plugins can have their own database files
- ✅ **Automatic npm install** - Dependencies installed automatically on plugin activation

### API Enhancements
- ✅ `POST /api/plugins/activate` - Activate plugin with automatic setup
- ✅ `POST /api/plugins/deactivate` - Deactivate plugin
- ✅ `GET /api/plugins/components/list` - Query registered client components
- ✅ `GET /api/plugins/components/get` - Get specific component info

---

## Features

- ✅ **23 Core Hooks** across 6 categories (System, User, Chat, Content, Plugin, Client)
- ✅ **Actions & Filters** (WordPress-style)
- ✅ **Priority System** (lower numbers run first)
- ✅ **Async/Await Support** (all hooks support async callbacks)
- ✅ **Graceful Error Handling** (hooks don't break on plugin errors)
- ✅ **Plugin Loader** (automatic loading from database)
- ✅ **Hook Statistics** (debugging & monitoring)
- ✅ **Component Registration** (dynamic UI components)
- ✅ **Plugin Activation Lifecycle** (setup and teardown)

---

## Quick Start

### 1. Create a Plugin

```javascript
// bb-plugins/my-plugin/index.js
async function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  // Register hooks
  hookService.addAction(HOOKS.CORE_INIT, async (context) => {
    console.log('My plugin initializing!');
  });

  hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
    // Validate or modify message
    return data;
  });
}

module.exports = { load };
```

### 2. Activate in Database

Add plugin to `plugins` table:
```sql
INSERT INTO plugins (name, file_path, is_active, priority)
VALUES ('my-plugin', 'my-plugin/index.js', 1, 10);
```

### 3. Restart Server

The plugin will be automatically loaded on next startup!

---

## Available Hooks

### Core Lifecycle (3 hooks)
- `bookbag_init` - System initialization
- `bookbag_ready` - System ready
- `bookbag_shutdown` - Graceful shutdown

### Admin (5 hooks)
- `admin_menu` - Add admin menu items
- `admin_view_render` - Modify admin views
- `admin_register_view` - Register custom views
- `admin_enqueue` - Add scripts/styles
- `admin_toolbar` - Modify admin toolbar

### Chat/Pipeline (5 hooks)
- `chat_before_message` - Validate user input
- `chat_after_message` - Log messages
- `llm_before_generate` - Inject RAG context
- `llm_after_generate` - Moderate LLM output
- `chat_response_final` - Format final response

### Frontend Client (3 hooks)
- `client_sidebar` - Modify client sidebar
- `client_toolbar` - Modify client toolbar
- `client_widget_render` - Register widgets

### System/Developer (4 hooks)
- `plugin_loaded` - Track plugin loading
- `plugin_activated` - Plugin activation
- `plugin_deactivated` - Plugin deactivation
- `routes_registered` - Register routes

---

## Example Plugins

### Example 1: RAG Plugin
**Location**: `/bb-plugins/example-rag-plugin/`

Demonstrates:
- Knowledge base search
- Context injection before LLM
- Admin menu integration
- Analytics logging

### Example 2: Moderation Plugin
**Location**: `/bb-plugins/example-moderation-plugin/`

Demonstrates:
- Input validation (blocked words)
- Output filtering (sensitive data)
- High-priority hooks
- Compliance logging

---

## Documentation

### Complete Reference
📖 **[HOOKS_REFERENCE.md](./docs/HOOKS_REFERENCE.md)** - Comprehensive 600+ line guide

Includes:
- Hook types explained
- All 21 hooks documented
- Context objects
- Use cases & examples
- Best practices
- Migration guide

### Developer Guide
The HOOKS_REFERENCE.md serves as the complete developer guide with:
- Quick start examples
- Real-world use cases
- Code samples
- API reference
- Debugging tips

---

## Architecture

### Core Files

```
components/plugins/app/core/
├── hookConstants.js        # 21 hook definitions
├── hookRegistration.js     # Actions & filters engine
├── hookInitializer.js      # Auto-registration
└── pluginLoader.js         # Plugin loading system
```

### Integration Points

```
config/initializers/config.js (line 77-119)
  → Initializes hooks
  → Fires bookbag_init
  → Loads plugins
  → Fires bookbag_ready
  → Registers shutdown handlers

components/admin/.../sidebarController.js (line 69)
  → Fires admin_menu hook

app/sockets/chatSocket.js
  → Chat hook integration points identified
```

---

## Hook System API

### Actions (Execute)
```javascript
// Register
hookService.addAction('bookbag_init', callback, priority);

// Fire
await hookService.doAction('bookbag_init', context);

// Remove
hookService.removeAction('bookbag_init', callback);

// Check
hookService.hasAction('bookbag_init'); // boolean
```

### Filters (Transform)
```javascript
// Register
hookService.addFilter('chat_before_message', callback, priority);

// Apply
const result = await hookService.applyFilters('chat_before_message', data);

// Remove
hookService.removeFilter('chat_before_message', callback);

// Check
hookService.hasFilter('chat_before_message'); // boolean
```

### Debugging
```javascript
// Get statistics
const stats = hookService.getHookStats();
console.log(JSON.stringify(stats, null, 2));

// Output:
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

---

## Use Cases

### ✅ RAG (Retrieval-Augmented Generation)
Hook into `llm_before_generate` to inject knowledge base context

### ✅ Content Moderation
Hook into `chat_before_message` and `llm_after_generate` to filter content

### ✅ Analytics & Logging
Hook into `chat_after_message` to log all chat activity

### ✅ Custom Admin Pages
Hook into `admin_menu` to add plugin settings pages

### ✅ Access Control
Hook into `chat_before_message` to enforce permissions

### ✅ Notifications
Hook into `chat_after_message` to send notifications

### ✅ Workflow Automation
Hook into multiple chat events to trigger workflows

### ✅ A/B Testing
Hook into `llm_before_generate` to modify prompts for experiments

---

## Best Practices

### 1. **Always Use Constants**
```javascript
// ✅ Good
hookService.addAction(HOOKS.CORE_INIT, callback);

// ❌ Bad
hookService.addAction('bookbag_init', callback);
```

### 2. **Handle Errors**
```javascript
hookService.addFilter(HOOKS.CHAT_BEFORE_MESSAGE, async (data) => {
  try {
    // Your logic
    return data;
  } catch (error) {
    console.error('Hook error:', error);
    return data; // Always return data
  }
});
```

### 3. **Use Priority Correctly**
- Core: 1-5
- Normal: 10 (default)
- UI: 15-20
- Analytics: 90-100

### 4. **Return Modified Data in Filters**
Always return the data object from filters, even if unchanged.

### 5. **Document Your Hooks**
List all hooks used in plugin documentation.

---

## Testing

### Manual Testing
```javascript
// Check if hook is registered
hookService.hasAction('bookbag_init'); // true/false

// View statistics
console.log(hookService.getHookStats());
```

### Integration Tests
See example plugins for working implementations:
- `/bb-plugins/example-rag-plugin/`
- `/bb-plugins/example-moderation-plugin/`

---

## Migration from Legacy Hooks

### Before (sidebarHook):
```javascript
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;
  sidebarHook.add_menu_page({ label: 'My Plugin' });
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
      icon: 'Settings'
    });
  });
}
```

---

## Roadmap

### ✅ Phase 1 (Complete)
- Core hook system
- 21 generic hooks
- Plugin loader
- Documentation
- Example plugins

### 🚧 Phase 2 (Future)
- Frontend hooks (React)
- WebSocket hooks
- Database hooks
- Cache hooks

### 🚧 Phase 3 (Future)
- Plugin marketplace
- Plugin dependencies
- Plugin versioning
- Auto-updates

---

## Support

### Documentation
- **[HOOKS_REFERENCE.md](./docs/HOOKS_REFERENCE.md)** - Complete reference
- **[Example Plugins](./bb-plugins/)** - Working examples

### Source Code
- **Core**: `/components/plugins/app/core/`
- **Examples**: `/bb-plugins/`
- **Integration**: `/config/initializers/config.js`

### Community
- Report issues on GitHub
- Share plugins with the community
- Contribute to documentation

---

## Credits

**Inspired by**: WordPress Plugin API
**Built for**: Bookbag Community Edition
**License**: Same as Bookbag CE

---

**🎉 Congratulations! The Bookbag Plugin System is ready for production use!**

Start building powerful plugins today with our comprehensive hooks architecture.

📖 Read the [Complete Hooks Reference](./docs/HOOKS_REFERENCE.md)
🚀 Check out [Example Plugins](./bb-plugins/)
🔧 Browse the [Source Code](./components/plugins/)
