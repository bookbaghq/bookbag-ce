# Plugin Manifest System

WordPress-style plugin discovery and metadata system for Bookbag plugins.

## Overview

Bookbag uses a WordPress-inspired plugin discovery system that automatically detects plugins in the `/bb-plugins` directory and reads their metadata. Plugins can declare their metadata in two ways:

1. **plugin.json** manifest file (recommended)
2. **Header comments** in the entry file (WordPress-style)

## Plugin Discovery Process

When Bookbag starts, it scans `/bb-plugins` and for each subdirectory:

1. Looks for `plugin.json` manifest file (preferred)
2. If not found, scans JS files for header comments
3. Falls back to defaults if neither is found
4. Entry file defaults to `index.js` if not specified

## Method 1: plugin.json Manifest (Recommended)

Create a `plugin.json` file in your plugin's root directory:

```json
{
  "name": "My Plugin",
  "slug": "my-plugin",
  "version": "1.0.0",
  "description": "Brief description of what your plugin does",
  "author": "Your Name",
  "entry": "index.js",
  "category": "admin-sidebar",
  "icon": "Zap",
  "priority": 10
}
```

### Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Display name of the plugin |
| `slug` | No | string | Unique identifier (defaults to directory name) |
| `version` | No | string | Plugin version (default: "1.0.0") |
| `description` | No | string | Short description |
| `author` | No | string | Plugin author |
| `entry` | No | string | Entry file name (default: "index.js") |
| `category` | No | string | Plugin category (default: "plugin") |
| `icon` | No | string | Lucide icon name |
| `priority` | No | number | Load order priority (default: 10, lower = earlier) |

### Categories

- `admin-sidebar` - Appears in admin sidebar menu
- `plugin` - Standard plugin
- `integration` - Third-party integration
- `core` - Core system plugin

## Method 2: Header Comments (WordPress-style)

Add a header comment block at the top of your entry file:

```javascript
/**
 * Plugin Name: My Plugin
 * Plugin Slug: my-plugin
 * Description: Brief description of what your plugin does
 * Version: 1.0.0
 * Author: Your Name
 * Entry: index.js
 * Category: admin-sidebar
 * Icon: Zap
 * Priority: 10
 */

function load(pluginAPI) {
  // Plugin code here
}

module.exports = { load };
```

### Supported Header Fields

- `Plugin Name` → `name` (required)
- `Plugin Slug` → `slug`
- `Description` → `description`
- `Version` → `version`
- `Author` → `author`
- `Entry` → `entry`
- `Category` → `category`
- `Icon` → `icon`
- `Priority` → `priority`

## Plugin Structure

### Minimum Structure
```
/bb-plugins/my-plugin/
├── plugin.json          # Manifest file
└── index.js             # Entry file with load() function
```

### Full Structure
```
/bb-plugins/my-plugin/
├── plugin.json          # Manifest
├── index.js             # Entry point
├── app/
│   ├── controllers/     # MasterController controllers
│   ├── models/          # MasterRecord models
│   └── services/        # Business logic
├── config/
│   ├── environments/    # Environment configs
│   └── routes.js        # Route definitions
├── pages/
│   ├── admin/           # Admin UI components
│   └── client/          # Client UI components
├── db/                  # SQLite databases
└── package.json         # npm dependencies (optional)
```

## Entry File Requirements

Your entry file must export a `load` function:

```javascript
/**
 * Load function - called by plugin system
 * @param {Object} pluginAPI - Plugin API object
 */
function load(pluginAPI) {
  const { hookService, HOOKS, registerView, registerClientComponent } = pluginAPI;

  // Register hooks, views, routes, etc.
}

module.exports = { load };
```

### Optional Functions

```javascript
/**
 * Activate function - called on first activation
 * @param {Object} pluginAPI - Plugin API object
 */
async function activate(pluginAPI) {
  // Install dependencies, run migrations, create directories
  return { success: true, message: 'Plugin activated' };
}

/**
 * Deactivate function - called on deactivation
 * @param {Object} pluginAPI - Plugin API object
 */
async function deactivate(pluginAPI) {
  // Cleanup tasks
  return { success: true, message: 'Plugin deactivated' };
}

module.exports = { load, activate, deactivate };
```

## Example Plugins

### Minimal Plugin

**plugin.json:**
```json
{
  "name": "Hello World Plugin",
  "description": "A simple example plugin"
}
```

**index.js:**
```javascript
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;

  hookService.addAction(HOOKS.BOOKBAG_READY, async () => {
    console.log('Hello from my plugin!');
  });
}

module.exports = { load };
```

### Full Plugin with Admin Menu

**plugin.json:**
```json
{
  "name": "Dashboard Plugin",
  "slug": "dashboard-plugin",
  "version": "1.0.0",
  "description": "Application statistics dashboard",
  "author": "Bookbag Team",
  "entry": "index.js",
  "category": "admin-sidebar",
  "icon": "BarChart3",
  "priority": 1
}
```

**index.js:**
```javascript
function load(pluginAPI) {
  const { hookService, HOOKS, registerView } = pluginAPI;

  // Register admin view
  registerView('dashboard-stats', 'pages/admin/dashboard/page', {
    title: 'Dashboard',
    capability: 'manage_options'
  });

  // Add admin menu
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({
      id: 'dashboard',
      label: 'Dashboard',
      url: '/bb-admin/plugin/dashboard-stats',
      icon: 'BarChart3',
      position: 10
    });
  });
}

module.exports = { load };
```

## Plugin API

The `pluginAPI` object passed to `load()` includes:

```javascript
{
  hookService,          // Hook registration service
  HOOKS,               // Available hook constants
  registerView,        // Register admin views
  registerClientComponent,  // Register client components
  pluginLoader,        // Plugin loader instance
  pluginPath           // Absolute path to plugin directory
}
```

## Best Practices

1. **Always use plugin.json** for better IDE support and validation
2. **Keep plugins self-contained** - include all dependencies
3. **Use semantic versioning** for version numbers
4. **Provide clear descriptions** for users
5. **Choose appropriate priority** - lower numbers load first
6. **Use descriptive icons** from Lucide icon set
7. **Follow naming conventions** - use kebab-case for slugs

## Testing Plugin Discovery

Test plugin discovery with:

```javascript
const PluginDiscovery = require('./bb-plugins/plugin-plugin/app/core/pluginDiscovery');
const discovery = new PluginDiscovery();

// Discover all plugins
const plugins = discovery.discoverPlugins();
console.log('Found plugins:', plugins);

// Get specific plugin
const metadata = discovery.getPluginMetadata('my-plugin');
console.log('Plugin metadata:', metadata);
```

## Migration from Old System

If you have existing plugins without manifests:

1. Create a `plugin.json` file in the plugin root
2. Fill in the metadata fields
3. The plugin will be automatically discovered on next restart
4. No changes to entry file needed

## Troubleshooting

### Plugin Not Discovered

- Check that `plugin.json` is valid JSON
- Verify the plugin directory is in `/bb-plugins`
- Check console for discovery errors
- Ensure `entry` file exists and exports `load()`

### Plugin Not Loading

- Check that entry file exports a `load` function
- Verify `load()` function signature matches documentation
- Check for JavaScript errors in entry file
- Review console logs during startup

### Metadata Not Recognized

- Validate JSON syntax in `plugin.json`
- Check field names match documentation exactly
- Ensure string fields are quoted
- Verify boolean/number fields are unquoted

## Related Documentation

- [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md)
- [Hook System](./HOOKS.md)
- [Plugin Loader](./PLUGIN_LOADER.md)
- [Admin Views](./ADMIN_VIEWS.md)
