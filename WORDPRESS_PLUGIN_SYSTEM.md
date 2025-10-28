# WordPress-Style Plugin System - Complete Implementation

A complete WordPress-inspired plugin architecture following the exact WordPress patterns for plugin discovery, loading, and sidebar menu registration.

## 📁 Directory Structure

```
bookbag-ce/
├── components/
│   ├── plugins/                          # Plugin Component (NEW)
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── hookRegistration.js   # Central hook registry service
│   │   │   │   └── pluginLoader.js       # Plugin file loading utilities
│   │   │   ├── hooks/
│   │   │   │   └── sidebarHook.js        # Sidebar menu hook management
│   │   │   ├── models/
│   │   │   │   ├── Plugin.js             # Plugin database model
│   │   │   │   └── pluginContext.js     # Plugin model context
│   │   │   └── services/
│   │   │       └── pluginLoaderService.js # WordPress-style plugin loader
│   │   └── config/
│   │       ├── initializers/
│   │       │   └── config.js             # Initializes hook system & loads plugins
│   │       └── routes.js                 # HTTP routes (empty for this component)
│   │
│   ├── admin/                            # Admin Component (renamed from settings)
│   │   ├── app/
│   │   │   ├── controllers/
│   │   │   │   ├── admin/
│   │   │   │   │   └── sidebarController.js  # Sidebar API
│   │   │   │   └── api/
│   │   │   │       └── settingsController.js # Settings management
│   │   │   └── models/
│   │   │       └── Setting.js            # Settings model (deprecated)
│   │   └── config/
│   │       └── routes.js                 # Admin routes
│   │
│   └── [other components: user, mail, rag, etc.]
│
├── bb-plugins/                           # Plugin Installation Directory
│   ├── rag-plugin/
│   │   └── ragPlugin.js                  # RAG plugin
│   │
│   ├── media-plugin/
│   │   └── mediaPlugin.js                # Media plugin
│   │
│   └── [other plugin folders...]
│
└── config/
    └── initializers/
        └── config.js                     # Registers plugins component
```

## 🔄 Complete Flow Diagram

```
Server Starts
     ↓
config/initializers/config.js
     ↓
master.component("components", "plugins")
     ↓
┌──────────────────────────────────────────────────┐
│ components/plugins/config/initializers/config.js │
│ 1. Loads sidebarHook.js (registers hooks)        │
│ 2. Calls pluginLoaderService.initializeDefaults() │
│ 3. Calls pluginLoader.loadActivePlugins()        │
└──────────────────────────────────────────────────┘
     
     ↓
┌─────────────────────────────────────────────┐
│ pluginLoaderService.loadActivePlugins()      │
│ 1. Queries: Plugin.findAll({is_active:true}) │
│ 2. Returns array like:                        │
│    [{file_path: 'rag-plugin/ragPlugin.js'}]  │
└─────────────────────────────────────────────┘
     ↓
WordPress-style plugin loading:
foreach ($plugin as $pluginPath) {
  require(bb-plugins/ + $pluginPath)
}
     ↓
┌──────────────────┬──────────────────┬──────────────────┐
│ rag-plugin/      │ media-plugin/    │ mail-plugin/     │
│ ragPlugin.js     │ mediaPlugin.js   │ mailPlugin.js    │
│                  │                  │                  │
│ Executes code:   │ Executes code:   │ Executes code:   │
│ onAdminMenu(...) │ onAdminMenu(...) │ onAdminMenu(...) │
│ registers hook   │ registers hook   │ registers hook   │
└──────────────────┴──────────────────┴──────────────────┘
     ↓
Hook callbacks registered in memory
     ↓
Server ready to handle requests
     ↓
     ↓
┌─────────────────────────────────────────────┐
│ Frontend loads admin page                    │
│ GET /admin/sidebar                           │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│ components/admin/app/controllers/admin/      │
│ sidebarController.getSidebar()               │
│                                              │
│ Calls: fireAdminMenuHook(context)           │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│ Hook System                                  │
│ do_action('admin_menu', context)             │
│                                              │
│ Executes ALL registered callbacks            │
│ (in priority order)                          │
└─────────────────────────────────────────────┘
     ↓
Each plugin callback runs:
  - Checks if plugin is active
  - Calls add_menu_page({id, label, path...})
  - Calls add_submenu_page(parent, {...})
     ↓
┌─────────────────────────────────────────────┐
│ Menu Registry (dataLayer.js)                 │
│ Collects all menu items                      │
│                                              │
│ menu = [{id:'rag', label:'RAG', path:'rag'}] │
│ submenu = {rag: [{id:'rag-index',...}]}     │
└─────────────────────────────────────────────┘
     ↓
Filter by user capabilities
     ↓
Generate WordPress-style URLs:
  'rag' → '/bb-admin/admin.php?page=rag'
  'rag-index' → '/bb-admin/admin.php?page=rag&subpage=rag-index'
     ↓
┌─────────────────────────────────────────────┐
│ Return JSON to frontend:                     │
│ {                                            │
│   menu: [{id, label, slug, url, icon}],     │
│   submenu: {parentId: [{...}]}              │
│ }                                            │
└─────────────────────────────────────────────┘
     ↓
Frontend renders sidebar menu
```

## 🔍 WordPress Comparison

### WordPress Plugin Loading

```php
// In wp-settings.php

// 1. Get active plugins from database
$active_plugins = get_option('active_plugins');
// Returns: ['akismet/akismet.php', 'woocommerce/woocommerce.php']

// 2. Load each plugin file
foreach ( $active_plugins as $plugin ) {
    include_once WP_PLUGIN_DIR . '/' . $plugin;
}

// 3. Plugin files execute and register hooks
// Inside akismet/akismet.php:
add_action('admin_menu', 'akismet_config_page');

// 4. Later, fire the hook
do_action('admin_menu');
```

### BookBag Equivalent

```javascript
// In components/plugins/app/services/pluginLoaderService.js

// 1. Get active plugins from database
const activePlugins = await Plugin.findAll({ where: { is_active: true } });
// Returns: [{file_path: 'rag-plugin/ragPlugin.js'}, ...]

// 2. Load each plugin file
for (const plugin of activePlugins) {
    require(bb-plugins/ + plugin.file_path);
}

// 3. Plugin files execute and register hooks
// Inside rag-plugin/ragPlugin.js:
onAdminMenu(async (context) => {
    add_menu_page({ id: 'rag', label: 'RAG', path: 'rag' });
});

// 4. Later, fire the hook
await doAction('admin_menu', context);
```

## 📊 Database Schema

### Plugin Model (components/plugins/app/models/Plugin.js)

```javascript
{
  id: INTEGER PRIMARY KEY AUTO_INCREMENT,
  name: STRING UNIQUE NOT NULL,          // 'rag-plugin'
  label: STRING NOT NULL,                // 'RAG Knowledge Base'
  description: STRING,                   // 'RAG features'
  file_path: STRING NOT NULL,            // 'rag-plugin/ragPlugin.js'
  is_active: BOOLEAN DEFAULT TRUE,       // Active status
  priority: INTEGER DEFAULT 10,          // Load order
  icon: STRING,                          // 'Database'
  category: STRING DEFAULT 'plugin',     // 'core', 'plugin'
  version: STRING DEFAULT '1.0.0',       // Plugin version
  author: STRING,                        // 'BookBag Team'
  created_at: STRING NOT NULL,
  updated_at: STRING NOT NULL
}
```

## 🎯 Key Components

### 1. Plugin Component (components/plugins/)

**Purpose:** Manages plugin discovery and loading

**Main Files:**
- `app/core/hookRegistration.js` - Central hook registry
- `app/core/pluginLoader.js` - Plugin file loading utilities
- `app/hooks/sidebarHook.js` - Sidebar menu hook management
- `app/models/Plugin.js` - Database model
- `app/services/pluginLoaderService.js` - Plugin initialization service
- `config/initializers/config.js` - Component initialization (NOT routes.js)
- `config/routes.js` - HTTP routes (empty - this component has no routes)

**What it does:**
1. Loads sidebarHook.js which registers 'admin_menu' hook with hookService
2. Seeds database with default plugins
3. Queries database for active plugins
4. Loads each plugin file using `require()`
5. Plugin files execute and register hooks

### 2. Admin Component (components/admin/)

**Purpose:** Provides admin APIs including sidebar

**Main Files:**
- `app/controllers/admin/sidebarController.js` - Sidebar API
- `app/controllers/api/settingsController.js` - Settings management
- `config/routes.js` - Admin routes

**Sidebar API Endpoints:**
- `GET /admin/sidebar` - Returns menu structure with URLs
- `GET /admin/sidebar/current?url={url}` - Returns active menu item

### 3. bb-plugins/ Directory

**Purpose:** Plugin installation directory (like `wp-content/plugins/`)

**Structure:**
```
bb-plugins/
├── core/                    # Core hook and menu systems
│   ├── hooks.js
│   └── admin/sidebar/
│       ├── dataLayer.js
│       ├── registration.js
│       └── middleware.js
│
└── [plugin-name]/           # Individual plugins
    └── [pluginName].js      # Main plugin file
```

**Plugin Files:**
Each plugin file:
1. Imports registration API: `require('../core/admin/sidebar/registration.js')`
2. Registers hooks: `onAdminMenu(...)`
3. Auto-executes when loaded: code runs immediately

## 🔌 Plugin File Template

```javascript
/**
 * My Plugin
 * Description of what this plugin does
 */

const { onAdminMenu, add_menu_page, add_submenu_page } = require('../core/admin/sidebar/registration.js');
const MasterRecord = require('masterrecord');

/**
 * Check if plugin is active (optional - for conditional features)
 */
async function isMyPluginEnabled(tenantId) {
  try {
    const Plugin = MasterRecord('Plugin', tenantId);
    const plugin = await Plugin.findOne({ where: { name: 'my-plugin' } });
    return plugin && plugin.is_active;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize plugin - registers hooks
 */
function initMyPlugin() {
  // Register callback for admin_menu hook
  onAdminMenu(async ({ req, user, tenantId }) => {
    // Check if enabled
    const enabled = await isMyPluginEnabled(tenantId);
    if (!enabled) return;

    // Register top-level menu
    add_menu_page({
      id: 'my-plugin',
      label: 'My Plugin',
      path: 'my-plugin',        // Slug for URL generation
      icon: 'Star',
      capability: 'manage_options',
      priority: 50
    });

    // Register submenu
    add_submenu_page('my-plugin', {
      id: 'my-plugin-settings',
      label: 'Settings',
      path: 'my-plugin-settings',
      capability: 'manage_options',
      priority: 10
    });
  }, 10); // Priority
}

// Auto-initialize when file is loaded
initMyPlugin();

module.exports = { initMyPlugin, isMyPluginEnabled };
```

## 🚀 Installation Flow

### Adding a New Plugin

**Step 1: Create Plugin File**
```bash
mkdir bb-plugins/analytics-plugin
touch bb-plugins/analytics-plugin/analyticsPlugin.js
```

**Step 2: Write Plugin Code**
(Use template above)

**Step 3: Add to Database**
```sql
INSERT INTO plugins (
  name, label, description, file_path, is_active, priority, icon, category
) VALUES (
  'analytics-plugin',
  'Analytics',
  'Site analytics and reporting',
  'analytics-plugin/analyticsPlugin.js',
  1,
  25,
  'BarChart',
  'plugin'
);
```

**Step 4: Restart Server**
Plugin loader will:
1. Find it in database
2. Load the file
3. Plugin registers hooks
4. Menus appear in sidebar

## 🎨 URL Generation

WordPress-style URL generation from slugs:

```javascript
// Rule 1: Full path (ends with .php)
generateUrl('edit.php')
// → '/bb-admin/edit.php'

// Rule 2: Custom top-level page
generateUrl('rag')
// → '/bb-admin/admin.php?page=rag'

// Rule 3: Submenu
generateUrl('rag-index', 'rag')
// → '/bb-admin/admin.php?page=rag&subpage=rag-index'
```

## 📡 Frontend Integration

### Fetch Sidebar Menu

```javascript
const response = await fetch('http://localhost:8080/admin/sidebar', {
  credentials: 'include'
});

const { menu, submenu } = await response.json();
```

### Example Response

```json
{
  "success": true,
  "menu": [
    {
      "id": "rag",
      "label": "RAG Knowledge Base",
      "slug": "rag",
      "url": "/bb-admin/admin.php?page=rag",
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
        "slug": "rag-index",
        "url": "/bb-admin/admin.php?page=rag&subpage=rag-index",
        "capability": "manage_rag",
        "priority": 5
      }
    ]
  }
}
```

### Render Menu

```javascript
{menu.map(item => (
  <div key={item.id}>
    <a href={item.url}>
      <Icon name={item.icon} />
      {item.label}
    </a>

    {submenu[item.id] && (
      <ul>
        {submenu[item.id].map(sub => (
          <li key={sub.id}>
            <a href={sub.url}>{sub.label}</a>
          </li>
        ))}
      </ul>
    )}
  </div>
))}
```

## 🔧 Configuration

### Server Bootstrap (config/initializers/config.js)

```javascript
// Register components in order
master.component("components", "user");
master.component("components", "chats");
master.component("components", "models");
master.component("components", "mail");
master.component("components", "workspace");
master.component("components", "media");
master.component("components", "rag");
master.component("components", "admin");

// Initialize plugins component (loads hook system & plugins)
master.component("components", "plugins");
```

## 🎯 Key Differences from WordPress

| Feature | WordPress | BookBag |
|---------|-----------|---------|
| Plugin storage | Serialized array in `wp_options` | Relational `plugins` table |
| Plugin directory | `wp-content/plugins/` | `bb-plugins/` |
| Discovery | File scan + DB array | Pure database query |
| Loading | `include_once` in PHP | `require()` in Node.js |
| Activation | Manual via admin UI | Add to database |
| Metadata | PHP header comments | Database fields |

## ✅ Summary

**Initialization:**
1. Server boots → loads plugins component
2. Plugins component initializes hook system
3. Service queries database for active plugins
4. Each plugin file is `require()`d
5. Plugin code executes and registers hooks

**Sidebar Building:**
1. Frontend requests `/admin/sidebar`
2. Sidebar controller calls `fireAdminMenuHook()`
3. Hook system fires all registered callbacks
4. Each plugin adds menu items
5. URLs generated from slugs
6. JSON returned to frontend
7. Frontend renders sidebar

**Result:** Complete WordPress-style plugin system with database-driven discovery, hook-based registration, and dynamic sidebar generation! 🚀

## 🔧 Hook System Architecture

### Central Hook Registry (hookRegistration.js)

The `components/plugins/app/core/hookRegistration.js` file provides the central hook system:

**Key Methods:**
- `registerHook(name, description)` - Register a hook name
- `addAction(hookName, callback, priority)` - Add a callback to a hook
- `doAction(hookName, context)` - Fire a hook and execute all callbacks
- `removeAction(hookName, callback)` - Remove a specific callback
- `hasAction(hookName)` - Check if hook has callbacks
- `getHookStats()` - Get debugging statistics

**Registration with Master:**
```javascript
// In config/initializers/config.js
const hookService = require('./components/plugins/app/core/hookRegistration.js');
master.register('hookService', hookService);
```

This makes hookService accessible to all controllers via dependency injection.

### Sidebar Hook (sidebarHook.js)

The `components/plugins/app/hooks/sidebarHook.js` manages sidebar menu data:

**WordPress-Style API:**
- `add_menu_page(menuItem)` - Add top-level menu
- `add_submenu_page(parentId, menuItem)` - Add submenu
- `onAdminMenu(callback, priority)` - Register callback for admin_menu hook

**Hook Management:**
- `fireAdminMenuHook(context)` - Fire admin_menu and collect menu data
- `getFilteredMenu(snapshot, user)` - Filter by user capabilities
- `buildMenuSnapshot()` - Create menu state snapshot

**Auto-Initialization:**
When sidebarHook.js is loaded, it automatically calls:
```javascript
hookService.registerHook('admin_menu', 'Fires when building the admin sidebar menu');
```

### Workflow Summary

1. **Server Boot:**
   - `config/initializers/config.js` registers hookService with master
   - Loads plugins component via `master.component('plugins')`

2. **Plugin Component Init:**
   - `master.component('plugins')` loads the plugins component
   - MasterController runs `components/plugins/config/initializers/config.js`
   - Initializer requires `sidebarHook.js` (registers admin_menu hook)
   - Calls `pluginLoaderService.initializeDefaultPlugins()`
   - Calls `pluginLoader.loadActivePlugins()`

3. **Plugin Loading:**
   - Queries Plugin model for active plugins
   - Requires each plugin file (e.g., `ragPlugin.js`)
   - Each plugin auto-executes and calls `onAdminMenu(callback)`
   - Callbacks registered in hookService

4. **Sidebar Request:**
   - Frontend calls `GET /admin/sidebar`
   - Sidebar controller calls `fireAdminMenuHook(context)`
   - Hook system fires all registered callbacks
   - Each plugin adds menu items via `add_menu_page()`
   - Menu data collected and filtered by capabilities
   - URLs generated from slugs
   - JSON returned to frontend

### File Organization

**Core Hook System:**
- `components/plugins/app/core/hookRegistration.js` - Central hook registry
- `components/plugins/app/core/pluginLoader.js` - Plugin file loading

**Specific Hooks:**
- `components/plugins/app/hooks/sidebarHook.js` - Sidebar menu management
- Future hooks can be added here (e.g., `contentHook.js`, `widgetHook.js`)

**Models & Services:**
- `components/plugins/app/models/Plugin.js` - Plugin database model
- `components/plugins/app/models/pluginContext.js` - Model context
- `components/plugins/app/services/pluginLoaderService.js` - Plugin initialization

**Controllers:**
- `components/admin/app/controllers/api/layout/sidebarController.js` - Sidebar API endpoint

This organization separates concerns:
- Core hook system (hookRegistration) is reusable for any hook type
- Specific hooks (sidebarHook) handle their own data management
- Plugins use the hooks without knowing implementation details

## 📝 MasterController Component Pattern

**Important:** MasterController components follow this structure:

```
components/[component-name]/
├── app/              # Application code (models, controllers, services)
└── config/
    ├── initializers/ # Component initialization code
    │   └── config.js # Runs when component loads
    └── routes.js     # HTTP route definitions ONLY
```

**Key Pattern:**
- `config/routes.js` - Exports array of HTTP routes **ONLY**
- `config/initializers/config.js` - All initialization code (loading services, registering hooks, etc.)

**Example:**

```javascript
// ❌ WRONG - Don't put initialization in routes.js
// components/plugins/config/routes.js
const pluginLoader = require('../app/core/pluginLoader');
pluginLoader.loadActivePlugins(); // NO!
module.exports = [];

// ✅ CORRECT - Put initialization in initializers/config.js
// components/plugins/config/initializers/config.js
const pluginLoader = require('../app/core/pluginLoader');
pluginLoader.loadActivePlugins(); // YES!

// components/plugins/config/routes.js
module.exports = []; // Just routes
```

When you call `master.component('components', 'plugins')`, MasterController:
1. Runs `components/plugins/config/initializers/config.js` (if exists)
2. Loads routes from `components/plugins/config/routes.js`
3. Registers routes with Express
