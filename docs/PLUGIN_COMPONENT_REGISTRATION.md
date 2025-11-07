# Plugin Component Registration

## How Plugins Register as MasterController Components

### Overview

For a plugin to serve controllers and routes, it needs to register itself as a **MasterController component**. This tells MasterController where to find the plugin's controllers when routing requests.

---

## The Key API: `master.component()`

### Syntax

```javascript
master.component(baseDirectory, componentName)
```

### Parameters

- **baseDirectory**: The root directory containing components (e.g., `"components"` or `"bb-plugins"`)
- **componentName**: The specific component/plugin directory name (e.g., `"user"`, `"rag-plugin"`)

### What It Does

When you call `master.component("bb-plugins", "rag-plugin")`, MasterController:

1. **Registers the directory path**: `{root}/bb-plugins/rag-plugin/`
2. **Makes controllers discoverable**: Routes can now find controllers in this directory
3. **Enables route resolution**: When a route like `"api/rag#ingestDocument"` is called, MasterController looks for:
   - `bb-plugins/rag-plugin/app/controllers/api/ragController.js`
   - Method: `ingestDocument()`

---

## Traditional Component Registration (Old Way)

### Location: `config/initializers/config.js`

```javascript
// Hardcoded in main config - loaded at app startup
master.component("components", "user");
master.component("components", "chats");
master.component("components", "models");
master.component("components", "mail");
master.component("components", "workspace");
master.component("components", "media");
master.component("components", "rag");  // ❌ Old way - hardcoded
master.component("components", "plugins");
master.component("components", "admin");
```

**Problems with this approach:**
- ❌ Hardcoded in main config
- ❌ Not dynamic - requires server restart to add/remove
- ❌ Tightly coupled to core system
- ❌ Can't enable/disable from database
- ❌ Not true "plugin" architecture

---

## Plugin Self-Registration (New Way)

### Location: `bb-plugins/rag-plugin/index.js`

```javascript
function load(pluginAPI) {
  const { hookService, HOOKS } = pluginAPI;
  const master = require('mastercontroller');

  // ✅ Plugin registers itself dynamically
  master.component("bb-plugins", "rag-plugin");

  // Now routes can find this plugin's controllers
  require('./config/routes.js');
}

module.exports = { load };
```

**Benefits of this approach:**
- ✅ Self-contained - plugin manages its own registration
- ✅ Dynamic - loads only when plugin is active in database
- ✅ Modular - can be enabled/disabled without code changes
- ✅ True plugin architecture
- ✅ Can be distributed as a package

---

## How Route Resolution Works

### Example Route Definition

In `bb-plugins/rag-plugin/config/routes.js`:

```javascript
var master = require('mastercontroller');
var router = master.router.start();

router.route("bb-rag/api/rag/ingest", "api/rag#ingestDocument", "post");
```

### Resolution Process

1. **Request comes in**: `POST /bb-rag/api/rag/ingest`

2. **Router matches route**: Finds `"api/rag#ingestDocument"`

3. **MasterController looks for controller**:
   - Pattern: `{component-dir}/app/controllers/api/ragController.js`
   - Searches registered components for file matching `api/rag`

4. **Finds controller**:
   - Because we called `master.component("bb-plugins", "rag-plugin")`
   - MasterController knows to look in: `bb-plugins/rag-plugin/app/controllers/api/ragController.js`

5. **Calls method**: Executes `ragController.ingestDocument()`

---

## Directory Structure Requirements

For `master.component()` to work, the plugin must follow this structure:

```
bb-plugins/rag-plugin/          ← registered via master.component()
├── app/
│   ├── controllers/
│   │   └── api/
│   │       ├── ragController.js      ← Found by "api/rag#method"
│   │       └── ragSettingsController.js  ← Found by "api/ragSettings#method"
│   ├── models/
│   └── service/
├── config/
│   └── routes.js
└── index.js                     ← Plugin entry point
```

**Key Pattern**: `{component-dir}/app/controllers/{path}/{controller-name}Controller.js`

---

## Complete Plugin Loading Flow

### 1. App Startup (`config/initializers/config.js`)

```javascript
// Main config loads plugin loader
master.register('hookService', hookService);
const pluginLoader = require('./components/plugins/app/core/pluginLoader.js');
```

### 2. Plugin Loading (`components/plugins/app/core/pluginLoader.js`)

```javascript
// Loads active plugins from database
loadActivePlugins() {
  const activePlugins = this.getActivePlugins();

  for (const plugin of activePlugins) {
    // Requires: bb-plugins/rag-plugin/index.js
    const pluginModule = require(pluginPath);

    // Calls the load() function
    pluginModule.load(pluginAPI);
  }
}
```

### 3. Plugin Self-Registration (`bb-plugins/rag-plugin/index.js`)

```javascript
function load(pluginAPI) {
  const master = require('mastercontroller');

  // ✅ Register as component
  master.component("bb-plugins", "rag-plugin");

  // ✅ Load routes
  require('./config/routes.js');

  // ✅ Register hooks
  hookService.addAction(HOOKS.ADMIN_MENU, (context) => {
    context.addMenuItem({ id: 'rag', label: 'RAG', ... });
  });
}
```

### 4. Request Handling

```
Client Request → MasterRouter → Component Lookup → Controller → Response
                                      ↓
                    Finds: bb-plugins/rag-plugin/app/controllers/api/ragController.js
```

---

## Comparison: Traditional vs Plugin

### Traditional Component (Hardcoded)

```javascript
// config/initializers/config.js
master.component("components", "rag");  // ← Hardcoded at startup

// components/rag/config/routes.js
router.route("bb-rag/api/rag/ingest", "api/rag#ingestDocument", "post");

// components/rag/app/controllers/api/ragController.js
class ragController { ... }
```

**Characteristics:**
- Always loaded (can't disable without code changes)
- Requires server restart to add/remove
- Hardcoded in main config
- Tightly coupled to core

---

### Plugin (Dynamic)

```javascript
// bb-plugins/rag-plugin/index.js
function load(pluginAPI) {
  const master = require('mastercontroller');
  master.component("bb-plugins", "rag-plugin");  // ← Self-registers
  require('./config/routes.js');
}

// bb-plugins/rag-plugin/config/routes.js
router.route("bb-rag/api/rag/ingest", "api/rag#ingestDocument", "post");

// bb-plugins/rag-plugin/app/controllers/api/ragController.js
class ragController { ... }
```

**Characteristics:**
- Only loaded if active in database
- Can be enabled/disabled dynamically
- Self-contained and modular
- Loosely coupled - true plugin

---

## Why This Matters

### Before (Component Model)
```
Application Startup
   ↓
Load ALL Components (hardcoded)
   ↓
Register ALL Routes
   ↓
Server Ready

❌ Can't disable features
❌ Can't add features without restart
❌ Everything loaded always
```

### After (Plugin Model)
```
Application Startup
   ↓
Load Plugin System
   ↓
Query Database for Active Plugins
   ↓
Each Active Plugin:
  - Registers itself as component
  - Loads its routes
  - Registers its hooks
   ↓
Server Ready

✅ Features can be toggled in DB
✅ Plugins load only when needed
✅ True modular architecture
```

---

## Summary

**The magic line:**

```javascript
master.component("bb-plugins", "rag-plugin");
```

**Does three things:**

1. **Tells MasterController**: "I have controllers at `bb-plugins/rag-plugin/app/controllers/`"
2. **Enables route resolution**: Routes like `"api/rag#method"` can find the plugin's controllers
3. **Makes plugin fully functional**: All MVC features work from the plugin directory

**Result**: The plugin behaves exactly like a traditional component, but:
- ✅ Self-contained
- ✅ Dynamically loaded
- ✅ Database-controlled
- ✅ True plugin architecture

---

## Next Steps

Apply this pattern to other components:
- `components/media` → `bb-plugins/media-plugin`
- `components/models` → `bb-plugins/models-plugin`
- `components/mail` → `bb-plugins/mail-plugin`

Each would self-register using `master.component("bb-plugins", "plugin-name")` in their `load()` function.
