# Bookbag Plugin System - Technical Architecture

## Overview

The Bookbag Plugin System is a WordPress-inspired, extensible plugin architecture that enables dynamic functionality extension without modifying core code. The system provides a robust framework for plugin discovery, loading, hooks/filters, and frontend integration with Next.js.

**Version:** 1.0.0
**Inspired by:** WordPress Plugin API
**Last Updated:** 2025

---

## Core Design Principles

1. **WordPress-style Philosophy**: Familiar patterns for developers with WordPress experience
2. **Hook-based Architecture**: Actions and filters provide standardized extension points
3. **Database-driven Activation**: Plugin state managed in database (similar to wp_options)
4. **Zero Core Modifications**: Plugins extend functionality without touching core code
5. **Dynamic Frontend Integration**: Automatic Next.js registry generation for seamless UI integration

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       BOOKBAG APPLICATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐         ┌─────────────────────────┐    │
│  │   Plugin Loader    │────────▶│   Hook Registration     │    │
│  │  (pluginLoader.js) │         │  (hookRegistration.js)  │    │
│  └────────┬───────────┘         └──────────┬──────────────┘    │
│           │                                 │                    │
│           │ Loads plugins from DB           │ Manages hooks      │
│           ▼                                 ▼                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Active Plugins (from database)              │  │
│  │  - rag-plugin    - media-plugin    - tokens-plugin       │  │
│  └──────────────┬────────────────────────────┬──────────────┘  │
│                 │                             │                  │
│                 │ Register hooks              │ Register UI      │
│                 ▼                             ▼                  │
│  ┌────────────────────┐         ┌─────────────────────────┐    │
│  │   Hook Service     │         │   Registry Generator    │    │
│  │  - Actions (fire)  │         │  (registryGenerator.js) │    │
│  │  - Filters (mod)   │         └──────────┬──────────────┘    │
│  └────────────────────┘                    │                    │
│                                             │ Generates          │
│                                             ▼                    │
│                              ┌──────────────────────────┐       │
│                              │  Next.js Plugin Registry │       │
│                              │  (registry.js)           │       │
│                              └──────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Plugin Loader (`pluginLoader.js`)

**Purpose**: Central orchestrator for the plugin system

**Responsibilities**:
- Load active plugins from database
- Execute plugin initialization methods
- Manage plugin lifecycle (activate/deactivate)
- Provide plugin API to loaded plugins
- Track registered views, components, and pages

**Key Methods**:
```javascript
class PluginLoader {
  // Load all active plugins from database
  loadActivePlugins(tenantId)

  // Load a single plugin file
  loadPluginFile(pluginData)

  // Get active plugins from database
  getActivePlugins(tenantId)

  // Activate/deactivate plugins
  activatePlugin(pluginName)
  deactivatePlugin(pluginName)

  // Discover plugins from filesystem
  discoverPlugins()

  // Register plugin UI components
  registerView(slug, componentPath, pluginName, metadata)
  registerClientComponent(componentName, componentPath, pluginName, metadata)
  registerPage(route, componentPath, pluginName)  // deprecated
}
```

**Singleton Pattern**: Exported as singleton instance for global access

---

### 2. Plugin Discovery (`pluginDiscovery.js`)

**Purpose**: WordPress-style plugin discovery and metadata extraction

**Discovery Methods**:
1. **plugin.json manifest** (preferred)
   ```json
   {
     "name": "RAG Plugin",
     "slug": "rag-plugin",
     "version": "1.0.0",
     "description": "RAG system integration",
     "author": "Bookbag Team",
     "entry": "index.js",
     "category": "plugin",
     "priority": 10
   }
   ```

2. **Header comments** (WordPress-style)
   ```javascript
   /**
    * Plugin Name: RAG Plugin
    * Plugin Slug: rag-plugin
    * Description: RAG system integration
    * Version: 1.0.0
    * Author: Bookbag Team
    */
   ```

3. **Default metadata** (fallback)

**Key Methods**:
```javascript
class PluginDiscovery {
  // Scan all plugins in /bb-plugins directory
  discoverPlugins()

  // Discover a single plugin
  discoverPlugin(pluginPath, pluginDir)

  // Read plugin.json manifest
  readManifest(manifestPath, pluginPath, pluginDir)

  // Parse WordPress-style header comments
  parseHeaderComments(filePath)

  // Find entry file (index.js, plugin.js, main.js)
  findEntryFile(pluginPath)
}
```

---

### 3. Hook Registration System (`hookRegistration.js`)

**Purpose**: WordPress-inspired hooks API for extensibility

**Hook Types**:

#### Actions (do_action)
Execute callbacks without returning values
```javascript
// Register action callback
hookService.addAction('chat_before_message', async (context) => {
  // Process message before sending to LLM
}, priority);

// Fire action
await hookService.doAction('chat_before_message', { message, userId });
```

#### Filters (apply_filters)
Modify data through callback chain
```javascript
// Register filter callback
hookService.addFilter('llm_before_generate', async (data, args) => {
  // Modify message history before LLM
  data.messageHistory.push({ role: 'system', content: 'Context from RAG' });
  return data;
}, priority);

// Apply filters
const modifiedData = await hookService.applyFilters('llm_before_generate', data, args);
```

**Core Methods**:
```javascript
class HookRegistration {
  // Actions
  addAction(hookName, callback, priority)
  removeAction(hookName, callback)
  doAction(hookName, context)
  hasAction(hookName)

  // Filters
  addFilter(hookName, callback, priority)
  removeFilter(hookName, callback)
  applyFilters(hookName, value, ...args)
  hasFilter(hookName)

  // Utilities
  getHookStats()
  getActiveHooks()
  _resetHooks()  // testing only
}
```

**Priority System**: Lower numbers run first (WordPress convention)
- Default priority: 10
- Early hooks: 1-9
- Late hooks: 11-20

---

### 4. Hook Constants (`hookConstants.js`)

**Purpose**: Centralized registry of available hooks

**Hook Categories**:

#### Core Lifecycle Hooks
```javascript
CORE_INIT          // System initializing (early boot)
CORE_READY         // System ready to accept requests
CORE_SHUTDOWN      // System shutting down
```

#### Admin Hooks
```javascript
ADMIN_MENU         // Register admin menu items
ADMIN_VIEW_RENDER  // Modify admin view output
ADMIN_REGISTER_VIEW // Register custom admin pages
ADMIN_ENQUEUE      // Enqueue scripts/styles
ADMIN_TOOLBAR      // Modify admin toolbar
```

#### Chat/Pipeline Hooks
```javascript
CHAT_BEFORE_MESSAGE   // Before processing user message
CHAT_AFTER_MESSAGE    // After saving message to DB
LLM_BEFORE_GENERATE   // Before sending to LLM (RAG injection point)
LLM_AFTER_GENERATE    // After LLM response
CHAT_RESPONSE_FINAL   // Final response before client
```

#### Frontend Client Hooks
```javascript
CLIENT_SIDEBAR_LEFT   // Register left sidebar components
CLIENT_SIDEBAR_RIGHT  // Register right sidebar components
CLIENT_MENU           // Register menu items
CLIENT_TOOLBAR        // Modify client toolbar
CLIENT_WIDGET_RENDER  // Register custom widgets
```

#### System/Developer Hooks
```javascript
PLUGIN_LOADED       // Plugin successfully loaded
PLUGIN_ACTIVATED    // Plugin activated
PLUGIN_DEACTIVATED  // Plugin deactivated
ROUTES_REGISTERED   // Routes being registered
```

---

### 5. Runtime Plugin Loading System

**Purpose**: PayloadCMS/Keystone-style dynamic plugin loading without rebuilds

**Architecture**:
- **Backend**: `/api/plugins/active` endpoint returns active plugins with bundle paths
- **Frontend**: `pluginLoader.js` singleton fetches and dynamically loads plugin bundles
- **Bundles**: Precompiled ES modules in `dist/` folders (admin.js, client.js)

**Workflow**:
1. Plugin is built using `./bin/bookbag.js build-plugin <name>`
2. Creates precompiled bundles in plugin's `dist/` folder
3. Plugin activated in database
4. Frontend `pluginLoader` fetches active plugins from backend
5. Dynamically loads bundles using `import(/* webpackIgnore: true */ bundleUrl)`
6. Components immediately available - no Next.js rebuild needed

**Frontend Plugin Loader**:
```javascript
// nextjs-app/lib/pluginLoader.js
class PluginLoader {
  async initialize() {
    // Fetch active plugins with bundle paths
    const response = await fetch(`${backendUrl}/api/plugins/active`);
    const data = await response.json();

    // Load each plugin's bundles
    for (const plugin of data.plugins) {
      await this.loadPlugin(plugin);
    }
  }

  async loadBundle(bundlePath) {
    const bundleUrl = `${backendUrl}${bundlePath}`;
    const module = await import(/* webpackIgnore: true */ bundleUrl);
    return module;
  }

  getComponent(slug, componentName, bundle = 'admin') {
    const plugin = this.getPlugin(slug);
    return plugin?.modules[bundle][componentName] || null;
  }
}
```

---

### 6. Database Models

#### Plugin Model (`plugin.js`)
```javascript
class Plugin {
  id                  // Auto-increment primary key
  name                // Unique plugin name (e.g., 'rag-plugin')
  label               // Display label
  description         // Plugin description
  file_path           // Relative path: '<plugin-name>/index.js'
  method_name_to_load // Method to call on load (default: 'load')
  is_active           // Boolean: plugin active state
  priority            // Load order priority
  icon                // Icon name for UI
  category            // Category: 'core', 'plugin', 'integration'
  version             // Semver version string
  author              // Plugin author
  created_at          // Timestamp
  updated_at          // Timestamp
}
```

#### Plugin Context (`pluginContext.js`)
```javascript
class pluginContext extends masterrecord.context {
  constructor() {
    super();
    this.env("config/environments");
    this.dbset(Plugin);  // Register Plugin model
  }
}
```

**Database Storage**: SQLite (development), supports other databases via MasterRecord ORM

---

## Plugin Lifecycle

### 1. System Boot
```
[Server Start]
    ↓
[Initialize Hook System]
    ↓
[Register Core Hooks]
    ↓
[Load Plugin Context from DB]
    ↓
[Query Active Plugins]
    ↓
[Load Each Plugin File]
    ↓
[Call plugin.load(pluginAPI)]
    ↓
[Plugins Register Hooks & UI]
    ↓
[Generate Next.js Registry]
    ↓
[System Ready]
```

### 2. Plugin Activation
```
[Admin Activates Plugin]
    ↓
[Update DB: is_active = 1]
    ↓
[Call plugin.activate(pluginAPI)]
    ↓
[Run Setup Tasks]
    - npm install
    - Database migrations
    - Configuration setup
    ↓
[Regenerate Next.js Registry]
    ↓
[Trigger Frontend Rebuild]
    ↓
[Plugin Active]
```

### 3. Plugin Deactivation
```
[Admin Deactivates Plugin]
    ↓
[Call plugin.deactivate(pluginAPI)]
    ↓
[Run Cleanup Tasks]
    ↓
[Update DB: is_active = 0]
    ↓
[Regenerate Next.js Registry]
    ↓
[Trigger Frontend Rebuild]
    ↓
[Plugin Inactive]
```

---

## Plugin API

When a plugin is loaded, it receives a `pluginAPI` object:

```javascript
const pluginAPI = {
  // Hook service for registering actions/filters
  hookService: hookRegistration,

  // All available hook constants
  HOOKS: HOOKS,

  // Reference to plugin loader
  pluginLoader: pluginLoader,

  // Register admin view (WordPress-style)
  registerView: (slug, componentPath, metadata) => {
    // Registers view accessible at /bb-admin/plugin/[slug]
  },

  // Register client-side component
  registerClientComponent: (componentName, componentPath, metadata) => {
    // Register reusable UI component
  },

  // Register page route (deprecated - use registerView)
  registerPage: (route, componentPath) => {
    // Registers custom route
  }
};
```

**Plugin Entry Point Example**:
```javascript
// bb-plugins/rag-plugin/index.js
module.exports = {
  // Called on plugin load
  load(pluginAPI) {
    const { hookService, HOOKS, registerView } = pluginAPI;

    // Register hook to inject RAG context
    hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, async (data) => {
      // Add RAG context to message history
      return modifiedData;
    }, 5);

    // Register admin views
    registerView('rag-settings', 'pages/admin/rag/settings', {
      title: 'RAG Settings',
      capability: 'manage_options'
    });
  },

  // Called on plugin activation
  async activate(pluginAPI) {
    console.log('Running RAG plugin activation tasks...');
    // Run migrations, install dependencies, etc.
    return { success: true };
  },

  // Called on plugin deactivation
  async deactivate(pluginAPI) {
    console.log('Running RAG plugin deactivation tasks...');
    // Cleanup tasks
    return { success: true };
  }
};
```

---

## Frontend Integration

### Runtime Plugin Loading System

**Problem**: Next.js requires static imports at build time, but plugins are dynamic.

**Solution**: Use dynamic ES module imports to load precompiled plugin bundles at runtime.

### Plugin Build System
```bash
# Build a single plugin
./bin/bookbag.js build-plugin rag-plugin

# Build all active plugins
./bin/bookbag.js build-plugins

# Output: Creates dist/admin.js and dist/client.js bundles
```

### Dynamic Component Loading
```javascript
// nextjs-app/app/bb-admin/_components/PluginViewClient.js
import { pluginLoader } from '@/lib/pluginLoader';

export default function PluginViewClient({ slug }) {
  useEffect(() => {
    async function loadView() {
      // Initialize plugin loader (fetches active plugins)
      await pluginLoader.initialize();

      // Get view info from backend
      const response = await fetch(`${backendUrl}/api/plugins/views/get?slug=${slug}`);
      const { view } = await response.json();

      // Convert slug to component name (rag-settings -> RagSettings)
      const componentName = slug.split('-').map(part =>
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('');

      // Load component from runtime registry
      const Component = pluginLoader.getComponent(view.pluginName, componentName, 'admin');
      setPluginComponent(() => Component);
    }
    loadView();
  }, [slug]);

  return PluginComponent ? <PluginComponent /> : null;
}
```

---

## API Controllers

### Plugin Activation Controller
```javascript
class pluginActivationController {
  // POST /api/plugins/activate
  async activatePlugin(req, res)

  // POST /api/plugins/deactivate
  async deactivatePlugin(req, res)

  // GET /api/plugins/list
  async listPlugins(req, res)

  // DELETE /api/plugins/delete
  async deletePlugin(req, res)
}
```

### Plugin Views Controller
```javascript
class pluginViewsController {
  // GET /api/plugins/views/get?slug=rag-settings
  async getPluginView(req, res)

  // GET /api/plugins/views/list
  async listViews(req, res)
}
```

### Plugin Components Controller
```javascript
class pluginComponentsController {
  // GET /api/plugins/components/list?usage=sidebar-left
  async listComponents(req, res)

  // GET /api/plugins/components/get?name=KnowledgeBaseSidebar
  async getComponent(req, res)
}
```

---

## Directory Structure

```
components/plugins/
├── app/
│   ├── api/
│   │   └── pluginManagement.js           # Plugin CRUD API
│   ├── controllers/
│   │   └── api/
│   │       ├── pluginActivationController.js
│   │       ├── pluginViewsController.js
│   │       ├── pluginComponentsController.js
│   │       └── pluginPagesController.js
│   ├── core/
│   │   ├── hookConstants.js              # Hook definitions
│   │   ├── hookInitializer.js            # Hook initialization
│   │   ├── hookRegistration.js           # Hook service (singleton)
│   │   ├── pluginDiscovery.js            # Plugin discovery
│   │   └── pluginLoader.js               # Main plugin loader
│   └── models/
│       ├── plugin.js                     # Plugin model
│       ├── pluginContext.js              # MasterRecord context
│       └── db/
│           └── migrations/               # Database migrations
├── config/
│   ├── environments/                     # Environment configs
│   └── routes.js                         # Plugin API routes
├── db/
│   └── development.sqlite3               # SQLite database
└── docs/                                 # This documentation
    ├── ARCHITECTURE.md
    ├── BUSINESS_OVERVIEW.md
    ├── DEVELOPER_GUIDE.md
    └── API_REFERENCE.md
```

---

## Data Flow Examples

### Example 1: RAG Context Injection
```
[User sends message]
    ↓
[CHAT_BEFORE_MESSAGE action fires]
    ↓
[Message saved to database]
    ↓
[CHAT_AFTER_MESSAGE action fires]
    ↓
[LLM_BEFORE_GENERATE filter fires]
    ↓
[RAG Plugin injects relevant documents]
    ← RAG Plugin returns: { messageHistory: [...history, ragContext] }
    ↓
[Modified history sent to LLM]
    ↓
[LLM generates response]
    ↓
[LLM_AFTER_GENERATE filter fires]
    ↓
[CHAT_RESPONSE_FINAL filter fires]
    ↓
[Response sent to client]
```

### Example 2: Admin Menu Registration
```
[Admin page loads]
    ↓
[ADMIN_MENU action fires]
    ↓
[Plugins register menu items]
    ← Media Plugin adds: "Media Library"
    ← RAG Plugin adds: "RAG Settings"
    ← Token Plugin adds: "Token Usage"
    ↓
[Menu rendered with all items]
```

---

## Performance Considerations

### 1. Plugin Loading
- **Lazy Loading**: Plugins only loaded when active
- **Priority System**: Control execution order to optimize critical path
- **Caching**: Plugin metadata cached during discovery

### 2. Hook Execution
- **Async Support**: Hooks support async/await
- **Error Isolation**: Hook errors don't crash entire system
- **Priority Sorting**: Callbacks sorted once at registration

### 3. Runtime Plugin Loading
- **Dynamic ES Module Imports**: Bundles loaded at runtime using import()
- **No Rebuild Required**: Plugins activate/deactivate instantly
- **Bundle Caching**: Loaded modules cached in memory for performance

---

## Security Considerations

### 1. Plugin Isolation
- Plugins run in same Node.js process (trust model)
- No sandboxing - plugins have full system access
- Manual security review required before installation

### 2. Database Access
- Plugins access database through MasterRecord ORM
- Context pattern provides scoped access
- SQL injection protection via parameterized queries

### 3. Frontend Security
- Plugin components inherit app security context
- Server-side rendering prevents XSS
- API authentication required for all endpoints

### 4. File System Access
- Plugins can read/write files
- No restrictions on file operations
- Trusted plugin sources only

---

## Testing Strategy

### Unit Tests
- Hook registration/execution
- Plugin discovery logic
- Registry generation

### Integration Tests
- Plugin lifecycle (activate/deactivate)
- Hook firing across plugin boundaries
- Database operations

### End-to-End Tests
- Full plugin installation flow
- Frontend component rendering
- API endpoint functionality

---

## Troubleshooting

### Common Issues

#### Plugin Not Loading
```
Check:
1. Plugin in database with is_active=1
2. file_path correct in database
3. Entry file exists at specified path
4. load() method exists in plugin module
```

#### Hooks Not Firing
```
Check:
1. Hook name matches HOOKS constant
2. Priority not conflicting with other plugins
3. Async callbacks returning promises
4. Error handling in hook callbacks
```

#### Frontend Component Not Rendering
```
Check:
1. Component registered via registerView/registerClientComponent
2. Registry regenerated after registration
3. Next.js build completed successfully
4. Webpack alias configured correctly
```

---

## Future Enhancements

### Planned Features
1. **Plugin Dependencies**: Specify plugin requirements
2. **Version Compatibility**: Require minimum Bookbag version
3. **Plugin Marketplace**: Browse and install from registry
4. **Automatic Updates**: Check for and install plugin updates
5. **Plugin Sandboxing**: Isolate plugins for security
6. **Performance Monitoring**: Track plugin performance impact

### API Expansions
1. **Settings API**: Standardized plugin settings storage
2. **Cache API**: Plugin-specific caching layer
3. **Queue API**: Background job processing
4. **Event System**: Real-time event broadcasting

---

## References

### WordPress Inspiration
- [WordPress Plugin API](https://codex.wordpress.org/Plugin_API)
- [WordPress Hooks](https://developer.wordpress.org/plugins/hooks/)
- [WordPress Plugin Handbook](https://developer.wordpress.org/plugins/)

### Related Documentation
- MasterController Framework
- MasterRecord ORM
- Next.js Documentation

---

**Document Version:** 1.0.0
**Last Updated:** 2025
**Maintained By:** Bookbag Engineering Team
