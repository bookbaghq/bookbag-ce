# BookBag Hook System Documentation

Welcome to the BookBag WordPress-style hook and plugin system! This system allows you to extend and customize BookBag's functionality through a familiar WordPress-like API.

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [Hook System](#hook-system)
5. [Menu System](#menu-system)
6. [Creating Plugins](#creating-plugins)
7. [Settings Management](#settings-management)
8. [API Reference](#api-reference)
9. [Examples](#examples)

## Overview

BookBag's plugin system is inspired by WordPress and provides:

- **Hook System**: Actions and filters with priority support
- **Menu Registry**: Dynamic menu management
- **Plugin Architecture**: Modular, toggle-able plugins
- **Settings Management**: Database-backed plugin settings
- **Per-Request Firing**: Conditional menu registration based on user/tenant

## Core Concepts

### Hooks

Hooks allow plugins to "hook into" specific points in the application lifecycle. There are two types:

- **Actions**: Execute code at specific points (e.g., `admin_menu`)
- **Filters**: Modify data before it's used (planned feature)

### Priority

Functions attached to hooks execute in order of priority (lowest first):

```javascript
addAction('admin_menu', myFunction, 10);  // Runs first
addAction('admin_menu', otherFunction, 20); // Runs second
```

### Plugins

Plugins are self-contained modules that register hooks and provide functionality. They can be enabled/disabled via the Settings UI.

## Getting Started

### File Structure

```
bb-hooks/src/
├── core/
│   ├── hooks.js              # Core hook system
│   └── admin/
│       ├── menuRegistry.js   # Menu management
│       ├── sidebarRegistration.js        # WordPress-style API
│       └── middleware.js     # Express integration
└── plugins/
    ├── index.js              # Plugin bootstrap
    ├── ragPlugin.js          # RAG plugin
    ├── mediaPlugin.js        # Media plugin
    ├── mailPlugin.js         # Mail plugin
    ├── workspacePlugin.js    # Workspace plugin
    ├── userPlugin.js         # User plugin
    └── settingsPlugin.js     # Settings plugin

components/settings/
├── app/
│   ├── models/
│   │   └── Setting.js        # Settings model
│   └── controllers/
│       └── api/
│           └── settingsController.js  # Settings API
└── config/
    └── routes.js             # Settings routes
```

### Basic Usage

```javascript
const { onAdminMenu, add_menu_page } = require('./bb-hooks/src/core/admin/sidebarRegistration.js');

// Register a callback for admin_menu hook
onAdminMenu(async ({ req, user, tenant, tenantId }) => {
  add_menu_page({
    id: 'my-plugin',
    label: 'My Plugin',
    path: '/admin/my-plugin',
    icon: 'Star',
    capability: 'manage_options',
    priority: 50
  });
}, 10);
```

## Hook System

### Available Hooks

#### `admin_menu`

Fires when building the admin menu. Use this to register menu items.

**Context:**
- `req` - Express request object
- `res` - Express response object
- `user` - Current user object
- `tenant` - Tenant object
- `tenantId` - Tenant ID string

**Example:**

```javascript
onAdminMenu(async (context) => {
  const { user, tenantId } = context;

  // Add menu items here
}, priority);
```

### Core Functions

#### `addAction(name, fn, priority = 10)`

Register a callback for an action hook.

```javascript
import { addAction } from './bb-hooks/src/core/hooks.js';

addAction('admin_menu', async (context) => {
  console.log('Admin menu is building!');
}, 10);
```

#### `doAction(name, context = {})`

Execute all callbacks registered for an action.

```javascript
import { doAction } from './bb-hooks/src/core/hooks.js';

await doAction('admin_menu', { req, res, user, tenant, tenantId });
```

#### `removeAction(name, fn)`

Remove a specific callback from a hook.

```javascript
import { removeAction } from './bb-hooks/src/core/hooks.js';

const myCallback = async (context) => { /* ... */ };
addAction('admin_menu', myCallback);
removeAction('admin_menu', myCallback); // Removes it
```

## Menu System

### Menu Structure

Menus have two levels:

1. **Top-level menus**: Main navigation items
2. **Submenus**: Items under a parent menu

### Adding Menus

#### `add_menu_page(options)`

Add a top-level menu item.

**Options:**
- `id` (required): Unique identifier
- `label` (required): Display text
- `path` (required): URL path
- `icon`: Icon name (Lucide icon)
- `capability`: Required user capability
- `priority`: Display order (default: 10)
- `render`: Render function (optional)

```javascript
add_menu_page({
  id: 'analytics',
  label: 'Analytics',
  path: '/admin/analytics',
  icon: 'BarChart',
  capability: 'view_analytics',
  priority: 25
});
```

#### `add_submenu_page(parentId, options)`

Add a submenu under a parent menu.

**Options:**
- `id` (required): Unique identifier
- `label` (required): Display text
- `path` (required): URL path
- `capability`: Required user capability
- `priority`: Display order (default: 10)
- `render`: Render function (optional)

```javascript
add_submenu_page('analytics', {
  id: 'analytics-dashboard',
  label: 'Dashboard',
  path: '/admin/analytics/dashboard',
  capability: 'view_analytics',
  priority: 5
});
```

### Removing Menus

#### `remove_menu_page(id)`

Remove a top-level menu and all its submenus.

```javascript
remove_menu_page('analytics');
```

#### `remove_submenu_page(parentId, id)`

Remove a specific submenu item.

```javascript
remove_submenu_page('analytics', 'analytics-dashboard');
```

### Capabilities

Capabilities control who can see menu items. Common capabilities:

- `manage_options` - Site administrators
- `manage_rag` - RAG management
- `upload_files` - Media upload
- `manage_mail` - Email management
- `list_users` - View users
- `create_users` - Create users

Users with role `admin` bypass all capability checks.

## Creating Plugins

### Plugin Structure

A plugin is a JavaScript module that registers hooks.

```javascript
// bb-hooks/src/plugins/myPlugin.js

const { onAdminMenu, add_menu_page, add_submenu_page } = require('../core/admin/sidebarRegistration.js');
const MasterRecord = require('masterrecord');

/**
 * Check if plugin is enabled
 */
async function isMyPluginEnabled(tenantId) {
  try {
    const Setting = MasterRecord('Setting', tenantId);
    const setting = await Setting.findOne({ where: { name: 'my-plugin' } });
    return setting && setting.is_active;
  } catch (error) {
    console.error('Error checking plugin status:', error);
    return true; // Default to enabled
  }
}

/**
 * Initialize plugin
 */
function initMyPlugin() {
  onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
    // Check if enabled for this tenant
    const enabled = await isMyPluginEnabled(tenantId || 'default');
    if (!enabled) return;

    // Register menu items
    add_menu_page({
      id: 'my-plugin',
      label: 'My Plugin',
      path: '/admin/my-plugin',
      icon: 'Star',
      capability: 'manage_options',
      priority: 50
    });

    add_submenu_page('my-plugin', {
      id: 'my-plugin-settings',
      label: 'Settings',
      path: '/admin/my-plugin/settings',
      capability: 'manage_options',
      priority: 10
    });
  }, 10);
}

module.exports = { initMyPlugin, isMyPluginEnabled };
```

### Registering Your Plugin

1. Create your plugin file in `bb-hooks/src/plugins/`
2. Import and initialize in `bb-hooks/src/plugins/index.js`:

```javascript
const { initMyPlugin } = require('./myPlugin.js');

function initializePlugins() {
  console.log('🔌 Initializing plugins...');

  // ... existing plugins
  initMyPlugin();

  console.log('✓ All plugins initialized');
}
```

### Adding Plugin Settings

1. Add to default settings in `components/settings/app/controllers/api/settingsController.js`:

```javascript
const defaults = [
  // ... existing settings
  {
    name: 'my-plugin',
    label: 'My Plugin',
    description: 'Enable my awesome plugin functionality',
    is_active: true,
    priority: 60,
    icon: 'Star',
    category: 'plugin'
  }
];
```

## Settings Management

### Settings Model

Settings are stored in the database with these fields:

- `name`: Unique identifier (e.g., 'rag', 'media')
- `label`: Display name
- `description`: Human-readable description
- `is_active`: Boolean toggle state
- `priority`: Display order
- `icon`: Icon name
- `category`: Grouping (e.g., 'core', 'plugin')
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Settings API

#### `GET /api/settings/list`

Get all settings ordered by priority.

```javascript
const response = await fetch('/api/settings/list', {
  credentials: 'include'
});
const { success, settings } = await response.json();
```

#### `GET /api/settings/:name`

Get a specific setting.

```javascript
const response = await fetch('/api/settings/rag', {
  credentials: 'include'
});
const { success, setting } = await response.json();
```

#### `POST /api/settings/:name/toggle`

Toggle a setting's `is_active` status.

```javascript
const response = await fetch('/api/settings/rag/toggle', {
  method: 'POST',
  credentials: 'include'
});
const { success, setting, message } = await response.json();
```

#### `PUT /api/settings/:name`

Update a setting.

```javascript
const response = await fetch('/api/settings/rag', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    description: 'Updated description',
    priority: 15
  })
});
```

#### `POST /api/settings`

Create or update a setting.

```javascript
const response = await fetch('/api/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    name: 'my-plugin',
    label: 'My Plugin',
    description: 'My plugin description',
    is_active: true,
    priority: 60,
    icon: 'Star',
    category: 'plugin'
  })
});
```

## API Reference

### Core Hooks (`bb-hooks/src/core/hooks.js`)

```javascript
// Register action callback
addAction(name: string, fn: Function, priority?: number): void

// Remove action callback
removeAction(name: string, fn: Function): void

// Execute action callbacks
doAction(name: string, context?: Object): Promise<void>

// Check if action has callbacks
hasAction(name: string): boolean

// Get callback count
actionCount(name: string): number

// Get all registered hook names
getRegisteredHooks(): string[]

// Reset all hooks (testing)
_resetHooks(): void
```

### Menu Registry (`bb-hooks/src/core/admin/menuRegistry.js`)

```javascript
// Add top-level menu
addMenuPage(options: MenuOptions): void

// Add submenu
addSubmenuPage(parentId: string, options: SubmenuOptions): void

// Remove top-level menu
removeMenuPage(id: string): void

// Remove submenu
removeSubmenuPage(parentId: string, id: string): void

// Get menu snapshot
buildMenuSnapshot(): { menu: Array, submenu: Object }

// Get menu IDs
getMenuIds(): string[]

// Get submenu IDs
getSubmenuIds(parentId: string): string[]

// Check if menu exists
hasMenu(id: string): boolean

// Check if submenu exists
hasSubmenu(parentId: string, id: string): boolean
```

### Sidebar Registration API (`bb-hooks/src/core/admin/sidebarRegistration.js`)

```javascript
// Register admin_menu callback
onAdminMenu(fn: Function, priority?: number): void

// Fire admin_menu hook and get snapshot
fireAdminMenuHook(context?: Object): Promise<Object>

// Check user capability
currentUserCan(user: Object, capability: string): boolean

// Filter menu by capability
filterMenuByCapability(items: Array, user: Object): Array

// Get filtered menu for user
getFilteredMenu(snapshot: Object, user: Object): Object

// WordPress-style aliases
add_menu_page = addMenuPage
add_submenu_page = addSubmenuPage
remove_menu_page = removeMenuPage
remove_submenu_page = removeSubmenuPage
get_menu_snapshot = buildMenuSnapshot
```

### Express Middleware (`bb-hooks/src/core/admin/middleware.js`)

```javascript
// Admin menu middleware
adminMenuMiddleware(): Function

// Menu API handler
adminMenuApiHandler(req, res): void

// Require capability middleware
requireCapability(capability: string): Function

// Get admin menu from res.locals
getAdminMenu(res): Object
```

## Examples

### Example 1: Basic Plugin

```javascript
// bb-hooks/src/plugins/notificationsPlugin.js

const { onAdminMenu, add_menu_page, add_submenu_page } = require('../core/admin/sidebarRegistration.js');

function initNotificationsPlugin() {
  onAdminMenu(async ({ user, tenantId }) => {
    add_menu_page({
      id: 'notifications',
      label: 'Notifications',
      path: '/admin/notifications',
      icon: 'Bell',
      capability: 'manage_notifications',
      priority: 35
    });

    add_submenu_page('notifications', {
      id: 'notifications-inbox',
      label: 'Inbox',
      path: '/admin/notifications/inbox',
      capability: null, // Everyone
      priority: 5
    });

    add_submenu_page('notifications', {
      id: 'notifications-settings',
      label: 'Settings',
      path: '/admin/notifications/settings',
      capability: 'manage_options',
      priority: 10
    });
  });
}

module.exports = { initNotificationsPlugin };
```

### Example 2: Conditional Menu Registration

```javascript
// Show different menus based on user role

onAdminMenu(async ({ user, tenantId }) => {
  if (user.role === 'admin') {
    add_menu_page({
      id: 'system',
      label: 'System',
      path: '/admin/system',
      icon: 'Cog',
      capability: 'manage_system',
      priority: 999
    });
  }

  // Regular users see different menu
  if (user.role === 'user') {
    add_menu_page({
      id: 'dashboard',
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: 'Home',
      priority: 1
    });
  }
});
```

### Example 3: Removing Default Menus

```javascript
// Remove a menu that was added by another plugin

const { onAdminMenu, remove_menu_page } = require('../core/admin/sidebarRegistration.js');

function initCustomizer() {
  onAdminMenu(async () => {
    // Remove the default comments menu
    remove_menu_page('comments');
  }, 999); // High priority runs last
}
```

### Example 4: Tenant-Specific Menus

```javascript
// Show menus only for specific tenants

const { onAdminMenu, add_menu_page } = require('../core/admin/sidebarRegistration.js');
const MasterRecord = require('masterrecord');

function initEnterprisePlugin() {
  onAdminMenu(async ({ tenantId }) => {
    // Check if tenant has enterprise features
    const Tenant = MasterRecord('Tenant', tenantId);
    const tenant = await Tenant.findOne({ where: { id: tenantId } });

    if (tenant && tenant.plan === 'enterprise') {
      add_menu_page({
        id: 'analytics',
        label: 'Analytics',
        path: '/admin/analytics',
        icon: 'BarChart',
        capability: 'view_analytics',
        priority: 25
      });
    }
  });
}
```

### Example 5: Using the Menu API

```javascript
// In your Express route

app.get('/admin/menu', adminMenuMiddleware(), adminMenuApiHandler);

// Response:
{
  "success": true,
  "menu": [
    {
      "id": "rag",
      "label": "RAG Knowledge Base",
      "path": "/admin/rag",
      "icon": "Database",
      "capability": "manage_rag",
      "priority": 30
    }
  ],
  "submenu": {
    "rag": [
      {
        "id": "rag-index",
        "label": "Index Management",
        "path": "/admin/rag/index",
        "capability": "manage_rag",
        "priority": 5
      }
    ]
  }
}
```

## Best Practices

1. **Check Plugin Status**: Always check if your plugin is enabled before registering menus
2. **Use Appropriate Priority**: Lower numbers for important items, higher for less important
3. **Set Capabilities**: Protect sensitive menus with appropriate capabilities
4. **Conditional Registration**: Use per-request firing to show/hide menus based on context
5. **Clean Removal**: When removing menus, use high priority (999) to run after registrations
6. **Error Handling**: Always wrap database queries in try-catch blocks
7. **Default to Enabled**: If checking plugin status fails, default to enabled for better UX

## Troubleshooting

### Menu Not Showing

1. Check plugin is enabled in Settings → Manage Plugins
2. Verify user has required capability
3. Check console for errors during plugin initialization
4. Ensure `onAdminMenu` callback is being fired

### Settings Not Persisting

1. Check database connection
2. Verify MasterRecord is initialized
3. Check console for database errors
4. Ensure settings table exists (migrations run)

### Capability Issues

1. Verify user object has `capabilities` array
2. Check that capability name matches exactly
3. Remember: `admin` role bypasses all checks
4. Use `null` capability for public menu items

## Contributing

To contribute a new plugin:

1. Create plugin file in `bb-hooks/src/plugins/yourPlugin.js`
2. Add to `bb-hooks/src/plugins/index.js`
3. Add default settings if needed
4. Document in this README
5. Submit pull request

## License

MIT

## Support

For questions or issues, please open a GitHub issue or contact the BookBag team.
