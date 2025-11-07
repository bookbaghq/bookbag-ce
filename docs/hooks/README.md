# Bookbag Hooks & Plugin System Documentation

> **Version:** 0.0.14
> **Last Updated:** November 5, 2024
> **Total Hooks:** 23

---

## 📚 Documentation Index

Welcome to the comprehensive documentation for Bookbag's WordPress-style hook system and plugin architecture.

---

### Core Documentation

#### 📦 [Plugin Development Guide](../PLUGIN_DEVELOPMENT_GUIDE.md) ⭐ NEW
**Complete guide to creating Bookbag plugins**
- Pre-bundled plugin architecture (like VS Code extensions)
- Step-by-step plugin creation
- Plugin structure and best practices
- ESM module system
- Building and testing plugins

**Use this when:** You're starting a new plugin or learning the plugin system

---

#### 🔧 [Dependency Compilation Guide](../DEPENDENCY_COMPILATION_GUIDE.md) ⭐ NEW
**How to bundle dependencies with esbuild**
- Understanding bundled vs external dependencies
- Adding npm packages to your plugin
- Build configuration with esbuild
- Bundle optimization techniques
- Troubleshooting build issues

**Use this when:** You need to add dependencies to your plugin or optimize bundle size

---

#### 🔍 [Hooks Directory](./HOOKS_DIRECTORY.md)
**Complete reference of all 23 available hooks**
- Organized by category (System, User, Chat, Content, Plugin, Client)
- Usage examples for each hook
- Hook implementation details
- Best practices and patterns

**Use this when:** You need to find a specific hook or understand what hooks are available

---

#### 📝 [Hooks Changelog](./HOOKS_CHANGELOG.md)
**Version-by-version history of hook changes**
- New hooks added
- Modified hooks
- Breaking changes and migration guides
- Future roadmap

**Use this when:** You're upgrading between versions or need to track hook evolution

---

#### 🔌 [Plugin Activation System](./PLUGIN_ACTIVATION_SYSTEM.md)
**WordPress-style plugin activation and deactivation**
- Complete activation workflow
- Plugin structure requirements
- `activate()` and `deactivate()` method implementation
- Self-contained plugins with own dependencies
- Troubleshooting guide

**Use this when:** You're creating a new plugin or adding activation logic

---

#### ⚡ [Dynamic Component Loading](./DYNAMIC_COMPONENT_LOADING.md)
**Runtime component registration and loading**
- Client-side component architecture
- DynamicPluginSidebar usage
- Component registration API
- Multiple sidebar positions (left, right, menu)
- Performance considerations

**Use this when:** You need to add UI components to the client interface

---

## 🚀 Quick Start

### For Plugin Developers

**1. Create a new plugin:**
```bash
mkdir -p bb-plugins/my-plugin
cd bb-plugins/my-plugin
```

**2. Create package.json:**
```json
{
  "name": "@bookbag/my-plugin",
  "version": "1.0.0",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "build": "node build.js"
  },
  "dependencies": {
    "your-dependency": "^1.0.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "lucide-react": "^0.485.0"
  },
  "devDependencies": {
    "esbuild": "^0.20.0"
  }
}
```

**3. Create build.js (see [Plugin Development Guide](../PLUGIN_DEVELOPMENT_GUIDE.md) for full version)**

**4. Create index.js with ESM exports:**
```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function load(pluginAPI) {
  const { hookService, HOOKS, registerView, registerClientComponent } = pluginAPI;

  // Register admin views
  registerView('my-settings', 'pages/admin/settings', {
    title: 'My Plugin Settings',
    icon: 'settings'
  });

  // Register client components
  registerClientComponent('MySidebar', 'pages/client/MySidebar.js', {
    usage: 'sidebar-left'
  });

  // Add hook listeners
  hookService.addAction(HOOKS.USER_LOGIN, async (user) => {
    console.log('User logged in:', user.email);
  });
}

async function activate(pluginAPI) {
  // Setup tasks (install dependencies, run migrations, etc.)
  return { success: true, message: 'Activated' };
}

async function deactivate(pluginAPI) {
  // Cleanup tasks
  return { success: true, message: 'Deactivated' };
}

export { load, activate, deactivate };
```

**5. Build your plugin:**
```bash
npm install
npm run build
```

**6. Activate your plugin:**
```bash
curl -X POST http://localhost:8080/api/plugins/activate \
  -H "Content-Type: application/json" \
  -d '{"name":"my-plugin"}'
```

📖 **For complete instructions, see [Plugin Development Guide](../PLUGIN_DEVELOPMENT_GUIDE.md)**

---

## 📊 Hook Statistics (v0.0.14)

| Category | Hooks | Description |
|----------|-------|-------------|
| System | 5 | Core system lifecycle (init, ready, shutdown, error, config) |
| User | 5 | User management (register, login, logout, update, delete) |
| Chat | 4 | Chat functionality (message sent/received, chat created/deleted) |
| Content | 3 | Content operations (create, update, delete) |
| Plugin | 3 | Plugin lifecycle (loaded, activated, deactivated) |
| **Client** ⭐ | **3** | **Client UI components (sidebar-left, sidebar-right, menu)** |
| **Total** | **23** | |

---

## 🆕 What's New in v0.0.14

### New Hooks (3)
- ✅ `CLIENT_SIDEBAR_LEFT` - Register left sidebar components
- ✅ `CLIENT_SIDEBAR_RIGHT` - Register right sidebar components
- ✅ `CLIENT_MENU` - Register client menu items

### New Features
- ✅ **Pre-bundled plugin architecture** (like VS Code extensions)
- ✅ **ESM module system** with esbuild compilation
- ✅ **Dependency bundling** - plugins compile their own dependencies
- ✅ WordPress-style plugin activation system
- ✅ Dynamic component loading (no hardcoded imports)
- ✅ Self-contained plugins with own `package.json`
- ✅ Plugin-specific database locations
- ✅ Enhanced masterrecord plugin path support

### Infrastructure Improvements
- ✅ `DynamicPluginSidebar` component for automatic component loading
- ✅ API endpoints: `/api/plugins/activate`, `/api/plugins/deactivate`
- ✅ API endpoint: `/api/plugins/components/list?usage=sidebar-left`
- ✅ Smart plugin path detection in masterrecord
- ✅ esbuild-based plugin compilation with external dependency support

### Documentation
- ✅ [Plugin Development Guide](../PLUGIN_DEVELOPMENT_GUIDE.md) - Complete plugin creation guide
- ✅ [Dependency Compilation Guide](../DEPENDENCY_COMPILATION_GUIDE.md) - Bundling dependencies

---

## 🎯 Common Use Cases

### Use Case 1: Add a Sidebar to Chat Interface

**Goal:** Display a custom sidebar with tools/info

**Steps:**
1. Create React component in `bb-plugins/my-plugin/pages/client/MySidebar.js`
2. Register component in plugin's `load()` method with `usage: 'sidebar-left'`
3. Component automatically appears in chat interface

**Read:** [Dynamic Component Loading](./DYNAMIC_COMPONENT_LOADING.md)

---

### Use Case 2: Run Code When User Logs In

**Goal:** Execute custom logic on user login

**Steps:**
1. Use `hookService.addAction(HOOKS.USER_LOGIN, callback)`
2. Callback receives user object
3. Perform your custom logic

**Read:** [Hooks Directory - USER_LOGIN](./HOOKS_DIRECTORY.md#user_login)

---

### Use Case 3: Create Database Tables on Plugin Activation

**Goal:** Setup database when plugin activates

**Steps:**
1. Create migrations in `bb-plugins/my-plugin/app/models/db/migrations/`
2. Add `activate()` method that runs `masterrecord update-database`
3. Activate plugin via API or admin UI

**Read:** [Plugin Activation System](./PLUGIN_ACTIVATION_SYSTEM.md)

---

### Use Case 4: Install Plugin Dependencies Automatically

**Goal:** Plugin has npm dependencies that install automatically

**Steps:**
1. Create `package.json` in plugin folder
2. Add dependencies
3. In `activate()` method, run `npm install`
4. Dependencies install automatically when plugin activates

**Read:** [Plugin Activation System - Step 1](./PLUGIN_ACTIVATION_SYSTEM.md#step-1-create-pluginpackagejson)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Bookbag Core                         │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │         Hook Service (hookService.js)           │   │
│  │  • Manages hook registration and execution      │   │
│  │  • addAction(), doAction()                      │   │
│  │  • addFilter(), applyFilters()                  │   │
│  └────────────────────────────────────────────────┘   │
│                         │                                │
│                         │ Provides hook access           │
│                         ↓                                │
│  ┌────────────────────────────────────────────────┐   │
│  │       Plugin Loader (pluginLoader.js)           │   │
│  │  • Loads plugins from bb-plugins/               │   │
│  │  • Manages plugin lifecycle                     │   │
│  │  • Provides pluginAPI to plugins                │   │
│  │  • activatePlugin(), deactivatePlugin()         │   │
│  └────────────────────────────────────────────────┘   │
│                         │                                │
│                         │ Loads and manages              │
│                         ↓                                │
│  ┌────────────────────────────────────────────────┐   │
│  │         Plugins (bb-plugins/*)                   │   │
│  │                                                  │   │
│  │  Each plugin has:                               │   │
│  │  • load() - Called every server start           │   │
│  │  • activate() - Called once on activation       │   │
│  │  • deactivate() - Called once on deactivation   │   │
│  │  • package.json - Own dependencies              │   │
│  │  • node_modules/ - Isolated dependencies        │   │
│  │  • config/environments/ - Own config            │   │
│  │  • db/ - Own database                           │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 API Reference

### Plugin API Object

Every plugin's `load()`, `activate()`, and `deactivate()` methods receive a `pluginAPI` object:

```javascript
const pluginAPI = {
  // Hook system
  hookService: HookService,
  HOOKS: HookConstants,

  // Registration functions
  registerView: (name, path, metadata) => void,
  registerClientComponent: (name, path, metadata) => void,

  // Plugin management
  pluginLoader: PluginLoader,
  pluginPath: string
};
```

---

### Hook Service Methods

```javascript
// Action hooks (execute callbacks)
hookService.addAction(hookName, callback, priority = 10)
hookService.doAction(hookName, data)
hookService.removeAction(hookName, callback)

// Filter hooks (modify values)
hookService.addFilter(hookName, callback, priority = 10)
hookService.applyFilters(hookName, value, ...args)
hookService.removeFilter(hookName, callback)
```

---

### API Endpoints

#### Plugin Management
```bash
# Activate plugin
POST /api/plugins/activate
Body: { "name": "plugin-name" }

# Deactivate plugin
POST /api/plugins/deactivate
Body: { "name": "plugin-name" }
```

#### Component Queries
```bash
# List components by usage
GET /api/plugins/components/list?usage=sidebar-left

# Get specific component
GET /api/plugins/components/get?name=ComponentName
```

#### View Queries
```bash
# List admin views
GET /api/plugins/views/list

# Get specific view
GET /api/plugins/views/get?name=view-name
```

---

## 📖 Additional Resources

### Internal Documentation
- Plugin loader source: `components/plugins/app/core/pluginLoader.js`
- Hook service source: `components/plugins/app/core/hookService.js`
- Hook constants: `components/plugins/app/core/hookConstants.js`

### Example Plugins
- RAG Plugin: `bb-plugins/rag-plugin/` - Full featured plugin with:
  - Database migrations
  - Admin views
  - Client components
  - Activation/deactivation
  - Own dependencies

### External Resources
- [WordPress Plugin Handbook](https://developer.wordpress.org/plugins/) - Inspiration for our system
- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import) - Used in component loading
- [MasterRecord Documentation](https://github.com/yourusername/masterrecord) - Database ORM

---

## 🐛 Troubleshooting

### Common Issues

**Plugin won't activate**
- Check plugin name matches folder name
- Verify plugin has `activate()` method
- Check server logs for errors

**Hook not firing**
- Verify hook name is correct (check `HOOKS` constants)
- Ensure plugin is loaded
- Check hook was added with `addAction()` not `addFilter()`

**Component not loading**
- Verify component registered with correct `usage` type
- Check import path is relative to plugin root
- Ensure component has default export
- Verify backend server is running

**Dependencies not installing**
- Check `package.json` exists in plugin folder
- Verify `activate()` method calls `npm install`
- Check for npm errors in activation response

---

## 🤝 Contributing

### Adding a New Hook

1. Update `components/plugins/app/core/hookConstants.js`
2. Update `HOOKS_DIRECTORY.md` with hook documentation
3. Update `HOOKS_CHANGELOG.md` with version information
4. Create example usage in a test plugin
5. Submit PR with all documentation updates

### Improving Documentation

1. Fork repository
2. Make changes to docs in `docs/hooks/`
3. Test examples work
4. Submit PR with clear description

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
- **Discussions:** [GitHub Discussions](https://github.com/bookbaghq/bookbag-ce/discussions)
- **Email:** support@bookbag.com

---

## 📄 License

Bookbag CE is MIT licensed. See LICENSE file for details.

---

**Happy Plugin Development! 🎉**

---

*Documentation maintained by the Bookbag team. Last updated November 5, 2024.*
