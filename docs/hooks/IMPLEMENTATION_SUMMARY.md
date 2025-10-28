# WordPress-Style Plugin System - Implementation Summary

## Overview

A complete WordPress-style hook and plugin system has been implemented for BookBag, allowing modular, toggle-able features with dynamic menu management.

## What Was Built

### 1. Core Hook System

**Location:** `bb-hooks/src/core/hooks.js`

- Action hook system with priority support
- `addAction()`, `doAction()`, `removeAction()` functions
- Similar to WordPress `add_action()` and `do_action()`
- Async/await support for modern Node.js

### 2. Menu Registry

**Location:** `bb-hooks/src/core/admin/menuRegistry.js`

- Dynamic menu management
- Two-level menu structure (top-level + submenus)
- Add, remove, query menu items
- Per-request menu building
- Capability-based filtering

### 3. WordPress-Style API

**Location:** `bb-hooks/src/core/admin/sidebarRegistration.js`

- WordPress-like function names (`add_menu_page`, `add_submenu_page`)
- `onAdminMenu()` hook registration
- `fireAdminMenuHook()` for per-request firing
- Capability checking helpers
- Menu filtering by user permissions

### 4. Express Middleware

**Location:** `bb-hooks/src/core/admin/middleware.js`

- `adminMenuMiddleware()` - Integrates with Express
- `adminMenuApiHandler()` - JSON API endpoint
- `requireCapability()` - Capability middleware
- Attaches menu to `res.locals.adminMenu`

### 5. Settings Management

**Component:** `components/settings/`

#### Model (`app/models/Setting.js`)
- `name` - Unique plugin identifier
- `is_active` - Toggle state
- `label` - Display name
- `description` - Plugin description
- `priority` - Display order
- `icon` - Icon name
- `category` - Grouping
- `created_at`, `updated_at` - Timestamps

#### Controller (`app/controllers/api/settingsController.js`)
- `list()` - Get all settings
- `get()` - Get one setting
- `toggle()` - Toggle is_active
- `update()` - Update setting
- `createOrUpdate()` - Upsert setting
- `delete()` - Remove setting
- `initializeDefaults()` - Seed default settings

#### Routes (`config/routes.js`)
```
GET    /api/settings/list
GET    /api/settings/:name
POST   /api/settings/:name/toggle
PUT    /api/settings/:name
DELETE /api/settings/:name
POST   /api/settings
```

### 6. Plugin System

**Location:** `bb-hooks/src/plugins/`

Six plugins implemented:

1. **RAG Plugin** (`ragPlugin.js`)
   - RAG Knowledge Base menu
   - Submenus: Index Management, Knowledge Sources, Statistics
   - Capability: `manage_rag`

2. **Media Plugin** (`mediaPlugin.js`)
   - Media Library menu
   - Submenus: Library, Upload New, Settings
   - Capability: `upload_files`

3. **Mail Plugin** (`mailPlugin.js`)
   - Email menu
   - Submenus: Send Email, Email Logs, SMTP Settings
   - Capability: `manage_mail`

4. **Workspace Plugin** (`workspacePlugin.js`)
   - Workspaces menu
   - Submenus: All Workspaces, Create New, Members
   - Capability: `manage_workspaces`

5. **User Plugin** (`userPlugin.js`)
   - Users menu
   - Submenus: All Users, Add New, Roles & Permissions, Your Profile
   - Capability: `list_users`

6. **Settings Plugin** (`settingsPlugin.js`)
   - Settings menu
   - Submenus: General, Manage Plugins, API Keys
   - Capability: `manage_options`

### 7. Plugin Bootstrap

**Location:** `bb-hooks/src/plugins/index.js`

- `initializePlugins()` - Registers all plugins
- `initializeDefaultSettings()` - Seeds database
- Called from `config/initializers/config.js`

### 8. Manage Plugins UI

**Location:** `nextjs-app/app/bb-admin/settings/manage/page.js`

React component featuring:
- List all plugins with toggle switches
- Real-time enable/disable
- Visual feedback (loading states)
- Icon display
- Status badges
- Description text
- Success/error notifications

## How It Works

### 1. Server Startup

```
server.js
  └─> config/initializers/config.js
      ├─> Loads settings component
      ├─> Calls initializePlugins()
      │   └─> All plugins register onAdminMenu() callbacks
      └─> Calls initializeDefaultSettings()
          └─> Seeds database with default plugin settings
```

### 2. Per-Request Flow

```
HTTP Request
  └─> adminMenuMiddleware()
      ├─> Fires admin_menu hook
      │   └─> Each plugin:
      │       ├─> Checks if enabled in database
      │       └─> Registers menu items if enabled
      ├─> Filters menu by user capabilities
      └─> Attaches to res.locals.adminMenu
```

### 3. Menu Building

```javascript
// Plugin registers on admin_menu hook
onAdminMenu(async ({ user, tenantId }) => {
  // Check if plugin is enabled
  const enabled = await isPluginEnabled(tenantId);
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
});
```

### 4. Toggle Flow

```
User clicks toggle in UI
  └─> POST /api/settings/:name/toggle
      ├─> Find setting in database
      ├─> Toggle is_active field
      ├─> Save to database
      └─> Return updated setting

Next request
  └─> Plugin checks is_active
      └─> Registers menu only if true
```

## File Structure

```
bookbag-ce/
├── bb-hooks/src/
│   ├── core/
│   │   ├── hooks.js                    # Core hook system
│   │   └── admin/
│   │       ├── menuRegistry.js         # Menu management
│   │       ├── sidebarRegistration.js              # WordPress-style API
│   │       └── middleware.js           # Express middleware
│   └── plugins/
│       ├── index.js                    # Bootstrap
│       ├── ragPlugin.js                # RAG plugin
│       ├── mediaPlugin.js              # Media plugin
│       ├── mailPlugin.js               # Mail plugin
│       ├── workspacePlugin.js          # Workspace plugin
│       ├── userPlugin.js               # User plugin
│       └── settingsPlugin.js           # Settings plugin
│
├── components/settings/
│   ├── app/
│   │   ├── models/
│   │   │   └── Setting.js              # Settings model
│   │   └── controllers/
│   │       └── api/
│   │           └── settingsController.js  # API
│   └── config/
│       └── routes.js                   # Routes
│
├── nextjs-app/app/bb-admin/settings/
│   └── manage/
│       └── page.js                     # Manage UI
│
├── config/initializers/
│   └── config.js                       # Updated: registers settings component
│
└── docs/hooks/
    ├── README.md                       # Full documentation
    ├── QUICK_REFERENCE.md              # Quick reference
    └── IMPLEMENTATION_SUMMARY.md       # This file
```

## Key Features

### 1. Per-Request Firing

Menus are built on every request, allowing:
- User-specific menus based on role/capabilities
- Tenant-specific features
- Real-time plugin enable/disable

### 2. Priority System

Lower numbers display first:
```javascript
priority: 10   // Main navigation
priority: 50   // Standard plugins
priority: 999  // Removal hooks
```

### 3. Capability Filtering

```javascript
{
  capability: 'manage_options'  // Only admins
  capability: null              // Everyone
  capability: 'upload_files'    // Specific permission
}
```

User with role `admin` bypasses all checks.

### 4. Database-Backed Settings

All plugin states persist in database:
```javascript
{
  name: 'rag',
  is_active: true,
  label: 'RAG Knowledge Base',
  description: '...',
  priority: 10,
  icon: 'Database',
  category: 'core'
}
```

### 5. Two-Level Menus

```javascript
// Top-level
add_menu_page({ id: 'rag', label: 'RAG', ... });

// Submenu
add_submenu_page('rag', { id: 'rag-index', label: 'Index', ... });
```

### 6. Removal Support

```javascript
// Remove unwanted menus
onAdminMenu(() => {
  remove_menu_page('comments');
}, 999);  // High priority = runs last
```

## Default Plugins

All enabled by default:

1. **RAG** (priority: 10) - Knowledge base
2. **Media** (priority: 20) - File management
3. **Mail** (priority: 30) - Email integration
4. **Workspace** (priority: 40) - Collaboration
5. **User** (priority: 50) - User management
6. **Settings** (priority: 100) - Configuration

## Usage Examples

### Add a New Plugin

1. **Create plugin file:**

```javascript
// bb-hooks/src/plugins/analyticsPlugin.js

const { onAdminMenu, add_menu_page } = require('../core/admin/sidebarRegistration.js');

function initAnalyticsPlugin() {
  onAdminMenu(async ({ user, tenantId }) => {
    add_menu_page({
      id: 'analytics',
      label: 'Analytics',
      path: '/admin/analytics',
      icon: 'BarChart',
      capability: 'view_analytics',
      priority: 25
    });
  });
}

module.exports = { initAnalyticsPlugin };
```

2. **Register in bootstrap:**

```javascript
// bb-hooks/src/plugins/index.js

const { initAnalyticsPlugin } = require('./analyticsPlugin.js');

function initializePlugins() {
  // ... existing plugins
  initAnalyticsPlugin();
}
```

3. **Add default setting:**

```javascript
// components/settings/app/controllers/api/settingsController.js

const defaults = [
  // ... existing
  {
    name: 'analytics',
    label: 'Analytics',
    description: 'View site analytics and reports',
    is_active: true,
    priority: 25,
    icon: 'BarChart',
    category: 'plugin'
  }
];
```

### Access Menu in Frontend

```javascript
// GET /admin/menu

{
  "success": true,
  "menu": [
    {
      "id": "rag",
      "label": "RAG Knowledge Base",
      "path": "/admin/rag",
      "icon": "Database",
      "priority": 30
    }
  ],
  "submenu": {
    "rag": [
      {
        "id": "rag-index",
        "label": "Index Management",
        "path": "/admin/rag/index",
        "priority": 5
      }
    ]
  }
}
```

## Testing

### 1. View Manage Page

Navigate to: `/bb-admin/settings/manage`

You should see all plugins with toggle switches.

### 2. Toggle a Plugin

Click the switch for "RAG Knowledge Base"

Expected:
- Loading spinner appears
- Success message shows
- Badge updates to "Disabled"
- On next page load, RAG menu is hidden

### 3. Check API

```bash
# List all settings
curl http://localhost:8080/api/settings/list

# Get one setting
curl http://localhost:8080/api/settings/rag

# Toggle setting
curl -X POST http://localhost:8080/api/settings/rag/toggle
```

### 4. Check Console

Look for:
```
🔌 Initializing plugins...
✓ All plugins initialized
✓ Initialized default setting: rag
✓ Initialized default setting: media
...
✓ Default settings initialized
```

## API Endpoints

### Settings API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/list` | Get all settings |
| GET | `/api/settings/:name` | Get one setting |
| POST | `/api/settings/:name/toggle` | Toggle setting |
| PUT | `/api/settings/:name` | Update setting |
| DELETE | `/api/settings/:name` | Delete setting |
| POST | `/api/settings` | Create/update setting |

### Menu API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/menu` | Get current user's menu (requires middleware) |

## Database Schema

### settings Table

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  priority INTEGER DEFAULT 10,
  icon VARCHAR(255),
  category VARCHAR(255) DEFAULT 'plugin',
  created_at VARCHAR(255) NOT NULL,
  updated_at VARCHAR(255) NOT NULL
);
```

## Benefits

1. **Modular Architecture** - Easy to add/remove features
2. **User-Friendly** - Toggle plugins via UI
3. **Per-Tenant** - Different features per tenant
4. **Per-User** - Capability-based access
5. **Developer-Friendly** - WordPress-like API
6. **Dynamic** - Menus build per-request
7. **Extensible** - Easy to add new plugins
8. **Database-Backed** - Settings persist
9. **Well-Documented** - Comprehensive docs

## Next Steps

1. **Add More Plugins** - Create additional features
2. **Frontend Menu** - Use menu API in React
3. **Plugin Dependencies** - Add dependency checking
4. **Plugin Marketplace** - Allow third-party plugins
5. **Advanced Capabilities** - More granular permissions
6. **Plugin Settings Pages** - Individual plugin configs
7. **Hooks Library** - Add more hook types
8. **Auto-Discovery** - Scan plugins folder
9. **Hot Reload** - Update plugins without restart
10. **Plugin API** - Expose APIs for plugins to use

## Troubleshooting

### Issue: Menus not showing

**Solution:**
1. Check plugin is enabled in `/bb-admin/settings/manage`
2. Verify user has required capability
3. Check console for errors
4. Ensure database connection is working

### Issue: Settings not persisting

**Solution:**
1. Check database connection
2. Verify MasterRecord is initialized
3. Run database migrations
4. Check console for errors

### Issue: Toggle not working

**Solution:**
1. Check API endpoint is accessible
2. Verify credentials are included
3. Check settingsController is loaded
4. Check routes are registered

## Support

- **Documentation**: `/docs/hooks/`
- **Quick Reference**: `/docs/hooks/QUICK_REFERENCE.md`
- **Full Guide**: `/docs/hooks/README.md`

## Conclusion

A complete WordPress-style plugin system has been implemented with:
- ✅ Core hook system
- ✅ Menu registry
- ✅ WordPress-style API
- ✅ Express middleware
- ✅ Settings management (model, controller, routes)
- ✅ Six default plugins
- ✅ Plugin bootstrap
- ✅ Manage UI
- ✅ Comprehensive documentation

The system is production-ready and easy to extend with new plugins.
