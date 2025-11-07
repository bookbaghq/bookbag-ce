# Plugin Development Guide

Complete guide to developing plugins for BookBag.

## Table of Contents

- [Overview](#overview)
- [Plugin System Architecture](#plugin-system-architecture)
- [Creating Your First Plugin](#creating-your-first-plugin)
- [Plugin Structure](#plugin-structure)
- [Available Hooks](#available-hooks)
- [Sidebar Menu Integration](#sidebar-menu-integration)
- [Database Access](#database-access)
- [Best Practices](#best-practices)
- [Publishing Plugins](#publishing-plugins)

## Overview

BookBag features a WordPress-style plugin system that allows you to extend functionality without modifying core code.

### What Can Plugins Do?

- **Add Menu Items**: Custom sidebar menus and submenus
- **Modify Behavior**: Hook into system events
- **Access Database**: Query and modify data
- **Add Features**: Extend core functionality
- **Custom Logic**: Implement business rules

### Plugin Loading

Plugins are:
1. Stored in `bb-plugins/` directory
2. Registered in database (admin UI)
3. Loaded automatically on startup
4. Given access to hook system

## Plugin System Architecture

```
┌─────────────────────────────────────────┐
│         Plugin Loader                   │
│  - Loads plugins from database          │
│  - Initializes plugin API               │
│  - Calls plugin load() function         │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  Plugin A   │     │  Plugin B   │
├─────────────┤     ├─────────────┤
│ load(api)   │     │ load(api)   │
│ - Hooks     │     │ - Hooks     │
│ - Menus     │     │ - Menus     │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └────────┬──────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│           Hook System                   │
│  - sidebarHook (menus)                  │
│  - hookService (filters/actions)        │
└─────────────────────────────────────────┘
```

## Creating Your First Plugin

### Step 1: Create Plugin Directory

```bash
mkdir -p bb-plugins/my-plugin
cd bb-plugins/my-plugin
```

### Step 2: Create index.js

```javascript
// bb-plugins/my-plugin/index.js

/**
 * My Custom Plugin
 * Adds custom functionality to BookBag
 */

/**
 * Load function - entry point for plugin
 * @param {Object} pluginAPI - Plugin API object
 */
function load(pluginAPI) {
  const { sidebarHook, hookService } = pluginAPI;

  console.log('My Plugin loaded!');

  // Add menu items
  sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
    sidebarHook.add_menu_page({
      id: 'my-plugin',
      label: 'My Plugin',
      icon: 'Zap',
      capability: 'read',
      priority: 50
    });

    sidebarHook.add_submenu_page('my-plugin', {
      id: 'my-plugin-settings',
      label: 'Settings',
      path: 'bb-admin/my-plugin/settings',
      capability: 'read',
      priority: 10
    });
  });

  // Add hooks (if needed)
  if (hookService) {
    hookService.addFilter('example_filter', (data) => {
      // Modify data
      return data;
    });
  }
}

module.exports = { load };
```

### Step 3: Register Plugin

1. Navigate to Admin → Plugins in BookBag
2. Click "Add Plugin"
3. Enter:
   - Name: `my-plugin`
   - Directory: `my-plugin`
   - Description: `My custom plugin`
   - Is Active: `true`
4. Save

### Step 4: Restart Server

```bash
# Restart to load the new plugin
pm2 restart bookbag
# or
npm run dev
```

Your plugin is now active!

## Plugin Structure

### Basic Structure

```javascript
/**
 * Plugin Name
 * Description of what the plugin does
 */

// Import dependencies
const MasterRecord = require('masterrecord');

/**
 * Load function - called when plugin loads
 * @param {Object} pluginAPI - API provided to plugin
 * @param {Object} pluginAPI.sidebarHook - Sidebar menu system
 * @param {Object} pluginAPI.hookService - Hook/filter system
 * @param {Object} pluginAPI.pluginLoader - Plugin loader instance
 */
function load(pluginAPI) {
  const { sidebarHook, hookService, pluginLoader } = pluginAPI;

  // Register menu items
  sidebarHook.onAdminMenu(async (context) => {
    // Add menus here
  });

  // Register hooks/filters
  if (hookService) {
    hookService.addFilter('filter_name', callback);
    hookService.addAction('action_name', callback);
  }
}

// Optional: cleanup function
function unload() {
  console.log('Plugin unloading...');
  // Cleanup code here
}

// Export load function
module.exports = { load, unload };
```

### Advanced Structure

For complex plugins, organize into multiple files:

```
bb-plugins/my-plugin/
├── index.js              # Entry point
├── menus.js              # Menu definitions
├── hooks.js              # Hook callbacks
├── services/             # Business logic
│   └── myService.js
├── utils.js              # Utilities
└── README.md             # Plugin documentation
```

**index.js:**
```javascript
const { registerMenus } = require('./menus');
const { registerHooks } = require('./hooks');

function load(pluginAPI) {
  registerMenus(pluginAPI.sidebarHook);
  registerHooks(pluginAPI.hookService);
}

module.exports = { load };
```

**menus.js:**
```javascript
function registerMenus(sidebarHook) {
  sidebarHook.onAdminMenu(async (context) => {
    // Menu registration
  });
}

module.exports = { registerMenus };
```

**hooks.js:**
```javascript
function registerHooks(hookService) {
  if (!hookService) return;

  hookService.addFilter('example_filter', (data) => {
    // Filter logic
    return data;
  });
}

module.exports = { registerHooks };
```

## Available Hooks

### Sidebar Hooks

#### onAdminMenu

Register admin menu items.

```javascript
sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
  // Add menu items
});
```

**Context Parameters:**
- `req`: Express request object
- `res`: Express response object
- `user`: Current user object
- `tenant`: Current tenant object
- `tenantId`: Current tenant ID

#### add_menu_page

Add a top-level menu item.

```javascript
sidebarHook.add_menu_page({
  id: 'unique-id',          // Unique identifier
  label: 'Menu Label',      // Display text
  icon: 'IconName',         // Lucide icon name
  capability: 'read',       // Required permission
  priority: 10              // Menu order (lower = higher)
});
```

**Available Icons:**
- `Home`, `User`, `Settings`, `MessageSquare`, `FileText`
- `Image`, `Database`, `Users`, `FolderOpen`, `Package`
- `Zap`, `Shield`, `Mail`, `Layout`, `Grid`
- See [Lucide Icons](https://lucide.dev) for full list

#### add_submenu_page

Add a submenu item under a parent menu.

```javascript
sidebarHook.add_submenu_page('parent-id', {
  id: 'submenu-id',              // Unique identifier
  label: 'Submenu Label',        // Display text
  path: 'bb-admin/path/to/page', // URL path (relative to domain)
  capability: 'read',            // Required permission
  priority: 10                   // Submenu order
});
```

### Hook Service (Filters & Actions)

#### addFilter

Modify data before processing.

```javascript
hookService.addFilter('filter_name', (data, ...args) => {
  // Modify data
  return modifiedData;
});
```

**Example: Modify Chat Message**
```javascript
hookService.addFilter('chat_message', (message, user, chat) => {
  // Add prefix to all messages
  message.content = `[${user.first_name}] ${message.content}`;
  return message;
});
```

#### addAction

Execute code on events (no return value).

```javascript
hookService.addAction('action_name', (data, ...args) => {
  // Perform action
  console.log('Action triggered:', data);
});
```

**Example: Log Chat Creation**
```javascript
hookService.addAction('after_chat_create', (chat, user) => {
  console.log(`User ${user.email} created chat: ${chat.title}`);
});
```

## Sidebar Menu Integration

### Example: Complete Menu System

```javascript
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {

    // Add top-level menu
    sidebarHook.add_menu_page({
      id: 'reports',
      label: 'Reports',
      icon: 'FileText',
      capability: 'read',
      priority: 30
    });

    // Add submenus
    sidebarHook.add_submenu_page('reports', {
      id: 'reports-usage',
      label: 'Usage Report',
      path: 'bb-admin/reports/usage',
      capability: 'read',
      priority: 5
    });

    sidebarHook.add_submenu_page('reports', {
      id: 'reports-tokens',
      label: 'Token Analytics',
      path: 'bb-admin/reports/tokens',
      capability: 'read',
      priority: 10
    });

    sidebarHook.add_submenu_page('reports', {
      id: 'reports-users',
      label: 'User Activity',
      path: 'bb-admin/reports/users',
      capability: 'administrator',  // Admin only
      priority: 15
    });

  });
}
```

### Conditional Menus

Show menus based on conditions:

```javascript
sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {

  // Only show for administrators
  if (user.role === 'administrator') {
    sidebarHook.add_menu_page({
      id: 'admin-tools',
      label: 'Admin Tools',
      icon: 'Shield',
      capability: 'administrator',
      priority: 90
    });
  }

  // Only show if feature is enabled
  const settings = await getSettings(req.adminContext);
  if (settings.is_custom_feature_active) {
    sidebarHook.add_menu_page({
      id: 'custom-feature',
      label: 'Custom Feature',
      icon: 'Zap',
      capability: 'read',
      priority: 40
    });
  }

});
```

## Database Access

Plugins can access the database through contexts.

### Accessing Contexts

Contexts are available in the `onAdminMenu` callback:

```javascript
sidebarHook.onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
  // Available contexts:
  const userContext = req.userContext;
  const chatContext = req.chatContext;
  const modelContext = req.modelContext;
  const ragContext = req.ragContext;
  const workspaceContext = req.workspaceContext;
  const mediaContext = req.mediaContext;
  const adminContext = req.adminContext;
});
```

### Query Examples

**Find User:**
```javascript
const user = userContext.User.find(userId);
```

**Get All Chats:**
```javascript
const chats = chatContext.Chat.all();
```

**Filter Chats:**
```javascript
const userChats = chatContext.Chat.where(chat =>
  chat.user_id === user.id
);
```

**Create Record:**
```javascript
const CustomModel = require('./models/customModel');
const record = new CustomModel();
record.name = 'Test';
record.created_at = Date.now().toString();

adminContext.CustomModel.add(record);
adminContext.saveChanges();
```

**Update Record:**
```javascript
const record = adminContext.CustomModel.find(id);
record.name = 'Updated';
record.updated_at = Date.now().toString();
adminContext.saveChanges();
```

**Delete Record:**
```javascript
const record = adminContext.CustomModel.find(id);
adminContext.CustomModel.remove(record);
adminContext.saveChanges();
```

### Using MasterRecord

```javascript
const MasterRecord = require('masterrecord');

// Define custom model
class CustomModel extends MasterRecord {
  id(db) { return { type: "INTEGER PRIMARY KEY AUTOINCREMENT" }; }
  name(db) { return { type: "TEXT NOT NULL" }; }
  created_at(db) { return { type: "TEXT NOT NULL" }; }
}

// Use in plugin
function load(pluginAPI) {
  // Query using the model
  // Note: Model must be registered in context first
}
```

## Best Practices

### 1. Naming Conventions

**Plugin Names:**
- Use lowercase with hyphens: `my-custom-plugin`
- Be descriptive: `token-export-plugin` not `plugin1`
- Avoid conflicts with existing plugins

**Menu IDs:**
- Prefix with plugin name: `my-plugin-settings`
- Use descriptive names: `reports-usage` not `r1`

**Hook Names:**
- Use descriptive names: `after_document_upload`
- Follow existing patterns: `before_*`, `after_*`, `filter_*`

### 2. Error Handling

Always handle errors gracefully:

```javascript
function load(pluginAPI) {
  try {
    const { sidebarHook, hookService } = pluginAPI;

    // Plugin logic
  } catch (error) {
    console.error('Error loading my-plugin:', error);
    // Don't throw - let other plugins load
  }
}
```

### 3. Performance

**Avoid Heavy Operations:**
```javascript
// Bad: Heavy computation in menu callback
sidebarHook.onAdminMenu(async (context) => {
  const allUsers = context.req.userContext.User.all();
  // Process thousands of users...
});

// Good: Defer to page load
sidebarHook.onAdminMenu(async (context) => {
  sidebarHook.add_menu_page({
    id: 'users',
    label: 'Users',
    path: 'bb-admin/users' // Load data on page, not menu
  });
});
```

### 4. Security

**Validate Permissions:**
```javascript
sidebarHook.onAdminMenu(async ({ user }) => {
  // Check user role
  if (user.role !== 'administrator') {
    return; // Don't add admin menus
  }

  // Add admin-only menus
});
```

**Sanitize Input:**
```javascript
hookService.addFilter('user_input', (input) => {
  // Sanitize input
  return input.trim().substring(0, 1000);
});
```

### 5. Documentation

Document your plugin:

```javascript
/**
 * Plugin Name: My Custom Plugin
 * Description: Adds custom reporting features
 * Version: 1.0.0
 * Author: Your Name
 * License: MIT
 */

/**
 * Load function
 * @param {Object} pluginAPI - Plugin API object
 * @param {Object} pluginAPI.sidebarHook - Sidebar menu system
 * @param {Object} pluginAPI.hookService - Hook system
 */
function load(pluginAPI) {
  // Plugin code
}
```

### 6. Testing

Test your plugin thoroughly:

```javascript
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  // Log for debugging
  console.log('Loading my-plugin...');

  sidebarHook.onAdminMenu(async (context) => {
    console.log('Adding menus for user:', context.user.email);

    // Add menus
    sidebarHook.add_menu_page({
      id: 'test',
      label: 'Test',
      icon: 'Zap',
      capability: 'read',
      priority: 99
    });

    console.log('Menus added successfully');
  });

  console.log('my-plugin loaded');
}
```

## Publishing Plugins

### Prepare for Release

1. **Clean up code**
   - Remove console.log statements
   - Add comments
   - Follow coding standards

2. **Create README**
   ```markdown
   # My Plugin

   Description of what your plugin does.

   ## Installation

   1. Copy to `bb-plugins/my-plugin/`
   2. Register in admin UI
   3. Restart server

   ## Configuration

   Settings and configuration instructions.

   ## Usage

   How to use the plugin.

   ## License

   MIT
   ```

3. **Version your plugin**
   ```javascript
   const PLUGIN_VERSION = '1.0.0';

   function load(pluginAPI) {
     console.log(`Loading My Plugin v${PLUGIN_VERSION}`);
   }
   ```

### Distribution

Currently, plugins are distributed as directories:

1. Package plugin directory
2. Provide installation instructions
3. Share via GitHub or other platforms

Future: Plugin marketplace planned.

## Examples

### Example 1: Simple Menu Plugin

```javascript
// bb-plugins/simple-menu/index.js
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  sidebarHook.onAdminMenu(async () => {
    sidebarHook.add_menu_page({
      id: 'custom-page',
      label: 'Custom Page',
      icon: 'Star',
      capability: 'read',
      priority: 50
    });
  });
}

module.exports = { load };
```

### Example 2: Hook Filter Plugin

```javascript
// bb-plugins/message-filter/index.js
function load(pluginAPI) {
  const { hookService } = pluginAPI;

  if (hookService) {
    hookService.addFilter('chat_message', (message) => {
      // Add timestamp to messages
      message.timestamp = new Date().toISOString();
      return message;
    });
  }
}

module.exports = { load };
```

### Example 3: Database Query Plugin

```javascript
// bb-plugins/user-stats/index.js
function load(pluginAPI) {
  const { sidebarHook } = pluginAPI;

  sidebarHook.onAdminMenu(async ({ req, user }) => {
    if (user.role === 'administrator') {
      const userCount = req.userContext.User.all().length;

      sidebarHook.add_menu_page({
        id: 'user-stats',
        label: `Users (${userCount})`,
        icon: 'Users',
        capability: 'administrator',
        priority: 80
      });
    }
  });
}

module.exports = { load };
```

## Troubleshooting

### Plugin Not Loading

1. Check plugin is registered in database
2. Check `is_active` is true
3. Restart server
4. Check server logs for errors
5. Verify `load` function is exported

### Menu Not Appearing

1. Check user has required capability
2. Verify menu ID is unique
3. Check path is correct
4. Clear browser cache

### Hook Not Firing

1. Verify hookService is available
2. Check hook name matches
3. Ensure plugin loads before hook fires
4. Check for errors in callback

## Next Steps

- Review [Hooks Reference](HOOKS_REFERENCE.md) for all available hooks
- Check [Plugin API](PLUGIN_API.md) for complete API documentation
- Study existing plugins in `bb-plugins/` for examples
- Join community discussions for help and ideas

## Resources

- [Developer Guide](../DEVELOPER_GUIDE.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
