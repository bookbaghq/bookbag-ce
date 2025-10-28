# BookBag WordPress-Style Plugin System

A complete WordPress-inspired plugin architecture with database-driven plugin discovery and dynamic loading.

## 🎯 How It Works (WordPress Style)

### 1. Plugin Discovery from Database

Just like WordPress stores active plugins in `wp_options.active_plugins`, BookBag stores them in the `settings` table:

```javascript
// WordPress way:
get_option('active_plugins');
// Returns: ["akismet/akismet.php", "woocommerce/woocommerce.php"]

// BookBag way:
Setting.findAll({ where: { is_active: true } });
// Returns: [{name: 'rag', file_path: 'rag-plugin/ragPlugin.js', ...}, ...]
```

### 2. Dynamic Plugin Loading

Similar to WordPress's `wp-settings.php`:

```php
// WordPress:
foreach ( get_option( 'active_plugins' ) as $plugin ) {
    include_once WP_PLUGIN_DIR . '/' . $plugin;
}

// BookBag equivalent in pluginLoader.js:
for (const plugin of activePlugins) {
    require(path.join(pluginsDir, plugin.file_path));
}
```

When a plugin file is loaded:
1. The file executes immediately
2. It calls `onAdminMenu()` to register hook callbacks
3. Those callbacks are stored in the global hook system
4. Later, when `do_action('admin_menu')` fires, all registered callbacks execute

### 3. Hook Registration

```javascript
// Inside ragPlugin.js (auto-runs when loaded):
const { onAdminMenu, add_menu_page } = require('../core/admin/sidebar/registration.js');

onAdminMenu(async ({ user, tenantId }) => {
  add_menu_page({
    id: 'rag',
    label: 'RAG Knowledge Base',
    path: '/admin/rag',
    icon: 'Database',
    priority: 30
  });
}, 10);
```

### 4. Menu Building Flow

```
Admin App Loads
     ↓
Triggers: do_action('admin_menu', context)
     ↓
Hook System calls all registered callbacks
     ↓
Each plugin callback runs:
  - Checks if plugin is enabled (from DB)
  - Calls add_menu_page() / add_submenu_page()
     ↓
Menu Registry collects all menu items
     ↓
Returns filtered menu based on user capabilities
     ↓
Admin sidebar renders the menu
```

## 📁 Directory Structure

```
components/bb-plugins/
├── core/
│   ├── hooks.js                        # Global hook system
│   ├── pluginLoader.js                 # WordPress-style plugin discovery
│   └── admin/
│       └── sidebar/
│           ├── dataLayer.js            # Menu data storage
│           ├── registration.js         # WordPress-style API
│           └── middleware.js           # Express integration
│
├── rag-plugin/
│   └── ragPlugin.js                    # RAG plugin
│
├── media-plugin/
│   └── mediaPlugin.js                  # Media plugin
│
├── mail-plugin/
│   └── mailPlugin.js                   # Mail plugin
│
├── workspace-plugin/
│   └── workspacePlugin.js              # Workspace plugin
│
├── user-plugins/
│   └── userPlugin.js                   # User management plugin
│
└── settings-plugin/
    └── settingsPlugin.js               # Settings plugin
```

## 🔌 Creating a New Plugin

### Step 1: Create Plugin Directory

```bash
mkdir components/bb-plugins/analytics-plugin
```

### Step 2: Create Plugin File

**File:** `components/bb-plugins/analytics-plugin/analyticsPlugin.js`

```javascript
/**
 * Analytics Plugin
 * Provides analytics and reporting features
 */

const { onAdminMenu, add_menu_page, add_submenu_page } = require('../core/admin/sidebar/registration.js');
const MasterRecord = require('masterrecord');

/**
 * Check if plugin is enabled
 */
async function isAnalyticsEnabled(tenantId) {
  try {
    const Setting = MasterRecord('Setting', tenantId);
    const setting = await Setting.findOne({ where: { name: 'analytics' } });
    return setting && setting.is_active;
  } catch (error) {
    console.error('Error checking Analytics status:', error);
    return false;
  }
}

/**
 * Initialize plugin - registers hooks when file is loaded
 */
function initAnalyticsPlugin() {
  onAdminMenu(async ({ req, res, user, tenant, tenantId }) => {
    // Check if enabled
    const enabled = await isAnalyticsEnabled(tenantId || 'default');
    if (!enabled) return;

    // Register menu
    add_menu_page({
      id: 'analytics',
      label: 'Analytics',
      path: '/admin/analytics',
      icon: 'BarChart',
      capability: 'view_analytics',
      priority: 25
    });

    add_submenu_page('analytics', {
      id: 'analytics-dashboard',
      label: 'Dashboard',
      path: '/admin/analytics/dashboard',
      capability: 'view_analytics',
      priority: 5
    });
  }, 10);
}

// Auto-initialize when file is loaded
initAnalyticsPlugin();

module.exports = { initAnalyticsPlugin, isAnalyticsEnabled };
```

### Step 3: Add to Database

```sql
INSERT INTO settings (
  name,
  label,
  description,
  file_path,
  is_active,
  priority,
  icon,
  category,
  created_at,
  updated_at
) VALUES (
  'analytics',
  'Analytics',
  'View site analytics and reports',
  'analytics-plugin/analyticsPlugin.js',
  1,
  25,
  'BarChart',
  'plugin',
  '1698432000000',
  '1698432000000'
);
```

Or use the API:

```javascript
await fetch('/api/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'analytics',
    label: 'Analytics',
    description: 'View site analytics and reports',
    file_path: 'analytics-plugin/analyticsPlugin.js',
    is_active: true,
    priority: 25,
    icon: 'BarChart',
    category: 'plugin'
  })
});
```

### Step 4: Restart Server

The plugin loader will:
1. Read the database
2. Find `analytics` with `is_active: true`
3. Load `analytics-plugin/analyticsPlugin.js`
4. The file executes and registers hooks
5. When admin menu loads, the analytics menu appears

## 🎛️ Plugin Loader API

### `loadActivePlugins(tenantId)`

Loads all active plugins from the database.

```javascript
const { loadActivePlugins } = require('./components/bb-plugins/core/pluginLoader.js');

await loadActivePlugins('default');
// Console output:
// 🔌 Loading active plugins from database...
//   Found 6 active plugin(s)
//   Loading plugin: rag-plugin/ragPlugin.js
//   ✓ rag-plugin/ragPlugin.js loaded successfully
//   ...
// ✓ All active plugins loaded
```

### `getActivePlugins(tenantId)`

Returns array of active plugin objects from database.

```javascript
const plugins = await getActivePlugins('default');
// Returns:
[
  {
    name: 'rag',
    label: 'RAG Knowledge Base',
    file_path: 'rag-plugin/ragPlugin.js',
    is_active: true,
    priority: 10,
    ...
  },
  ...
]
```



## 🔧 Settings Database Schema

```javascript
{
  id: INTEGER PRIMARY KEY AUTO_INCREMENT,
  name: STRING UNIQUE NOT NULL,           // 'rag', 'media', etc.
  label: STRING NOT NULL,                 // 'RAG Knowledge Base'
  description: STRING,                    // Human-readable description
  file_path: STRING,                      // 'rag-plugin/ragPlugin.js'
  is_active: BOOLEAN DEFAULT TRUE,        // Enable/disable toggle
  priority: INTEGER DEFAULT 10,           // Display order
  icon: STRING,                           // 'Database', 'Image', etc.
  category: STRING DEFAULT 'plugin',      // 'core', 'plugin', 'integration'
  created_at: STRING NOT NULL,
  updated_at: STRING NOT NULL
}
```

## 🚀 Startup Sequence

**File:** `config/initializers/config.js`



**Timeline:**

```
Server starts
     ↓
Database connects
     ↓
2 second delay (ensure DB ready)
     
     ↓
loadActivePlugins()
  → Queries: SELECT * FROM settings WHERE is_active = 1
  → For each result:
      require(pluginsDir + '/' + plugin.file_path)
      → Plugin file runs immediately
      → Calls onAdminMenu() to register hooks
     ↓
All plugins loaded and hooks registered
     ↓
Server ready to handle requests
```

## 🎨 Admin Sidebar Rendering

**When user navigates to admin:**

```
User loads /bb-admin
     ↓
Express route handler
     ↓
adminMenuMiddleware() runs:
  1. Calls fireAdminMenuHook(context)
  2. This calls do_action('admin_menu', context)
  3. All registered plugin callbacks execute
  4. Each plugin calls add_menu_page(), add_submenu_page()
  5. Menu registry collects all items
  6. Returns menu snapshot
  7. Filters by user capabilities
     ↓
Filtered menu attached to res.locals.adminMenu
     ↓
React sidebar component renders menu
```

## 🛠️ Managing Plugins

### Enable/Disable via UI

Navigate to `/bb-admin/settings/manage` to toggle plugins on/off.

### Enable/Disable via API

```bash
# Disable RAG plugin
curl -X POST http://localhost:8080/api/settings/rag/toggle

# Enable it again
curl -X POST http://localhost:8080/api/settings/rag/toggle
```

### List All Plugins

```bash
curl http://localhost:8080/api/settings/list
```

### Check Plugin Status

```javascript
const { isRagEnabled } = require('./rag-plugin/ragPlugin.js');
const enabled = await isRagEnabled('default');
```

## 🔍 Debugging

### Check What Plugins Are Loaded

```javascript
// In your code:
const { getActivePlugins } = require('./components/bb-plugins/core/pluginLoader.js');

const plugins = await getActivePlugins('default');
console.log('Active plugins:', plugins.map(p => p.file_path));
```

### Check What Hooks Are Registered

```javascript
const { getRegisteredHooks, actionCount } = require('./components/bb-plugins/core/hooks.js');

console.log('Registered hooks:', getRegisteredHooks());
console.log('admin_menu callbacks:', actionCount('admin_menu'));
```

### Check Menu Snapshot

```javascript
const { get_menu_snapshot } = require('./components/bb-plugins/core/admin/sidebar/registration.js');

const snapshot = get_menu_snapshot();
console.log('Current menu:', snapshot);
```

## 📝 Best Practices

1. **Always check if plugin is enabled** before registering menus
2. **Use descriptive plugin folder names** (e.g., `analytics-plugin`, not just `analytics`)
3. **Include `file_path` in database** so plugins can be loaded dynamically
4. **Call `initPlugin()` at the end of your plugin file** to auto-register when loaded
5. **Export both init function and enable check** for flexibility
6. **Use appropriate priorities** (lower numbers = higher priority)
7. **Set capabilities** to protect sensitive features
8. **Handle errors gracefully** in plugin code
9. **Test plugin enable/disable** functionality
10. **Document your plugin** with comments and README

## 🎯 Key Differences from WordPress

| Feature | WordPress | BookBag |
|---------|-----------|---------|
| Plugin storage | Serialized array in `wp_options` | Relational table with metadata |
| Plugin location | `wp-content/plugins/` | `components/bb-plugins/` |
| Activation | Manual file upload + activate | Add to database or use API |
| Auto-load | MU plugins in `mu-plugins/` | All active plugins from DB |
| Discovery | File scan + DB check | Pure database-driven |
| Metadata | Plugin header comments | Database fields |

## ✅ Complete Example

See existing plugins for reference:
- **Simple:** `settings-plugin/settingsPlugin.js`
- **With database checks:** `rag-plugin/ragPlugin.js`
- **Multiple submenus:** `user-plugins/userPlugin.js`

## 🔗 Related Files

- **Hook System:** `components/bb-plugins/core/hooks.js`
- **Plugin Loader:** `components/bb-plugins/core/pluginLoader.js`
- **Menu Registry:** `components/bb-plugins/core/admin/sidebar/dataLayer.js`
- **Registration API:** `components/bb-plugins/core/admin/sidebar/registration.js`
- **Middleware:** `components/bb-plugins/core/admin/sidebar/middleware.js`
- **Settings Model:** `components/settings/app/models/Setting.js`
- **Settings API:** `components/settings/app/controllers/api/settingsController.js`
- **Config Bootstrap:** `config/initializers/config.js`

## 📚 Further Reading

- [WordPress Plugin API](https://developer.wordpress.org/plugins/)
- [WordPress Hook System](https://developer.wordpress.org/plugins/hooks/)
- [WordPress Plugin Header Requirements](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/)
