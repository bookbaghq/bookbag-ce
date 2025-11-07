# Bookbag Plugin Development Guide

## Overview

Bookbag uses a **pre-bundled plugin architecture** similar to VS Code extensions, Figma plugins, and Obsidian plugins. Each plugin bundles its own dependencies into a single `dist/plugin.js` file before installation, eliminating dependency conflicts and simplifying deployment.

## Table of Contents

1. [Plugin Architecture](#plugin-architecture)
2. [Creating a New Plugin](#creating-a-new-plugin)
3. [Plugin Structure](#plugin-structure)
4. [Dependency Management](#dependency-management)
5. [Building Plugins](#building-plugins)
6. [Plugin API](#plugin-api)
7. [Best Practices](#best-practices)

---

## Plugin Architecture

### Key Concepts

**Pre-bundled Plugins:**
- Each plugin compiles its dependencies into a single `dist/plugin.js` file
- No `npm install` needed in production
- Shared libraries (React, UI components) provided by Bookbag core
- Plugin-specific dependencies bundled into the artifact

**Benefits:**
- ✅ No dependency conflicts between plugins
- ✅ Faster activation (no npm install)
- ✅ Smaller plugin footprint (shared libs not duplicated)
- ✅ Sandboxed execution
- ✅ Version control friendly (dist/ is gitignored)

### How It Works

```
┌─────────────────────────────────────────────────┐
│ Plugin Development                              │
│                                                 │
│  1. Write plugin code (ESM)                     │
│  2. npm run build                               │
│  3. esbuild bundles code + dependencies         │
│  4. Output: dist/plugin.js (6-50kb typically)   │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│ Bookbag Core Loading                            │
│                                                 │
│  1. Reads bb-plugins/*/dist/plugin.js           │
│  2. Imports as ESM module                       │
│  3. Provides shared libraries as externals      │
│  4. Calls load(), activate(), deactivate()      │
└─────────────────────────────────────────────────┘
```

---

## Creating a New Plugin

### Step 1: Create Plugin Directory

```bash
mkdir -p bb-plugins/my-plugin
cd bb-plugins/my-plugin
```

### Step 2: Initialize package.json

```json
{
  "name": "@bookbag/my-plugin",
  "version": "1.0.0",
  "description": "My awesome Bookbag plugin",
  "main": "index.js",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.js",
    "dev": "node build.js --watch"
  },
  "dependencies": {
    // Plugin-specific dependencies (will be bundled)
  },
  "peerDependencies": {
    // Shared libraries (provided by Bookbag core)
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.485.0",
    "sonner": "^2.0.7"
  },
  "devDependencies": {
    "esbuild": "^0.20.0"
  },
  "keywords": ["bookbag-plugin"],
  "author": "Your Name",
  "license": "MIT"
}
```

### Step 3: Create Build Script

Create `build.js`:

```javascript
#!/usr/bin/env node

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('🔨 Building Plugin...');

try {
  await build({
    entryPoints: [join(__dirname, 'index.js')],
    outfile: join(distDir, 'plugin.js'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',

    // Mark shared dependencies as external (provided by Bookbag core)
    external: [
      'react',
      'react-dom',
      'lucide-react',
      'sonner',
      '@bookbag/sdk',
      'mastercontroller',
      // Add other shared libraries here
    ],

    sourcemap: true,
    minify: false, // Set to true for production

    logLevel: 'info',
  });

  console.log('✅ Plugin built successfully!');
  console.log(`📦 Output: ${join(distDir, 'plugin.js')}`);

} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
```

### Step 4: Create .gitignore

Create `.gitignore`:

```
node_modules/
dist/
*.log
.DS_Store
```

### Step 5: Create Plugin Entry Point

Create `index.js`:

```javascript
/**
 * My Plugin
 * Description of what this plugin does
 */

import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load method - called when plugin is loaded
 * @param {Object} pluginAPI - { hookService, HOOKS, registerView, registerClientComponent }
 */
async function load(pluginAPI) {
  const { hookService, HOOKS, registerView, registerClientComponent } = pluginAPI;

  console.log('  ✓ Loading My Plugin...');

  // Register admin views
  registerView('my-plugin-settings', 'pages/admin/settings/page', {
    title: 'My Plugin Settings',
    capability: 'manage_options',
    icon: 'settings'
  });

  // Register client components
  registerClientComponent('MyCustomSidebar', 'pages/client/MySidebar.js', {
    description: 'Custom sidebar component',
    usage: 'sidebar-left',
    features: ['feature-1', 'feature-2']
  });

  // Register admin menu hook
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    context.addMenuItem({
      id: 'my-plugin',
      label: 'My Plugin',
      url: '/bb-admin/plugin/my-plugin-settings',
      icon: 'Puzzle',
      position: 40
    });
  }, 10);

  console.log('  ✓ My Plugin loaded successfully');
}

/**
 * Activate method - called when plugin is first activated
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginPath }
 */
async function activate(pluginAPI) {
  console.log('\n🔌 Activating My Plugin...');

  try {
    // Setup tasks: create directories, run migrations, etc.
    console.log('  ✓ Plugin setup complete');

    // Fire plugin activated hook
    if (pluginAPI.hookService && pluginAPI.HOOKS) {
      await pluginAPI.hookService.doAction(pluginAPI.HOOKS.PLUGIN_ACTIVATED, {
        pluginName: 'my-plugin',
        pluginPath: __dirname
      });
    }

    return {
      success: true,
      message: 'My Plugin activated successfully'
    };
  } catch (error) {
    console.error('✗ Activation failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deactivate method - called when plugin is deactivated
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginPath }
 */
async function deactivate(pluginAPI) {
  console.log('\n🔌 Deactivating My Plugin...');

  try {
    // Cleanup tasks
    console.log('  ✓ Plugin cleanup complete');

    // Fire plugin deactivated hook
    if (pluginAPI.hookService && pluginAPI.HOOKS) {
      await pluginAPI.hookService.doAction(pluginAPI.HOOKS.PLUGIN_DEACTIVATED, {
        pluginName: 'my-plugin',
        pluginPath: __dirname
      });
    }

    return {
      success: true,
      message: 'My Plugin deactivated successfully'
    };
  } catch (error) {
    console.error('✗ Deactivation failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export { load, activate, deactivate };
```

---

## Plugin Structure

### Recommended Directory Layout

```
bb-plugins/my-plugin/
├── index.js                    # Plugin entry point (load, activate, deactivate)
├── build.js                    # esbuild configuration
├── package.json                # Dependencies and build config
├── .gitignore                  # Ignore node_modules, dist, logs
│
├── pages/
│   ├── admin/                  # Admin views
│   │   └── settings/
│   │       └── page.js
│   └── client/                 # Client components
│       └── MySidebar.js
│
├── app/
│   ├── controllers/            # API controllers
│   │   └── MyController.js
│   └── models/                 # Database models (if using MasterRecord)
│       ├── MyContext.js
│       └── db/
│           └── migrations/
│
├── config/
│   ├── routes.js               # Plugin routes
│   └── environments/           # Environment-specific configs
│       ├── env.development.json
│       └── env.production.json
│
├── lib/                        # Plugin utilities
│   └── helpers.js
│
├── dist/                       # Build output (gitignored)
│   ├── plugin.js
│   └── plugin.js.map
│
└── node_modules/               # Dependencies (gitignored)
```

---

## Dependency Management

### Understanding Dependency Types

#### 1. Regular Dependencies (Bundled)

These are **plugin-specific** libraries that will be **bundled into dist/plugin.js**:

```json
{
  "dependencies": {
    "pdf-parse": "^2.3.0",           // PDF processing
    "mammoth": "^1.11.0",             // Word doc processing
    "@xenova/transformers": "^2.17.2", // ML models
    "csv-parser": "^3.2.0",           // CSV parsing
    "cheerio": "^1.1.2"               // HTML parsing
  }
}
```

**Use for:**
- Libraries unique to your plugin
- Libraries with specific version requirements
- Node.js modules (fs, path, etc. - automatically handled)

#### 2. Peer Dependencies (External)

These are **shared libraries** provided by Bookbag core and **NOT bundled**:

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.485.0",
    "sonner": "^2.0.7",
    "@bookbag/sdk": "*",
    "mastercontroller": "*"
  }
}
```

**Use for:**
- React and React DOM
- UI component libraries (lucide-react, sonner)
- Bookbag SDK
- MasterController ORM
- Any library shared across plugins

#### 3. Dev Dependencies

Build-time tools only:

```json
{
  "devDependencies": {
    "esbuild": "^0.20.0"
  }
}
```

### Adding Dependencies

#### To add a plugin-specific dependency:

```bash
npm install package-name --save
```

This adds to `dependencies` and will be bundled.

#### To add a shared library:

```bash
npm install package-name --save-peer
```

Then add to `external` array in `build.js`:

```javascript
external: [
  'react',
  'react-dom',
  'package-name', // Add here
],
```

---

## Building Plugins

### Development Build

```bash
npm run build
```

Output:
```
🔨 Building Plugin...
✅ Plugin built successfully!
📦 Output: dist/plugin.js

  dist/plugin.js       15.2kb
  dist/plugin.js.map   28.4kb

⚡ Done in 12ms
```

### Watch Mode (Development)

```bash
npm run dev
```

Automatically rebuilds when source files change.

### Production Build

Update `build.js` to enable minification:

```javascript
await build({
  // ... other options
  minify: true,  // Enable minification
  sourcemap: false, // Disable source maps for production
});
```

### Build Output Analysis

Check what's included in your bundle:

```bash
# Check bundle size
ls -lh dist/plugin.js

# View bundled content (first 50 lines)
head -50 dist/plugin.js

# Search for specific imports
grep -n "import.*from" dist/plugin.js
```

### Common Build Issues

#### Error: "module.exports is not defined"

**Problem:** Using CommonJS syntax in ESM module.

**Solution:**
```javascript
// ❌ Don't use:
module.exports = { load, activate, deactivate };

// ✅ Use:
export { load, activate, deactivate };
```

#### Error: "require is not defined"

**Problem:** Using CommonJS require in ESM module.

**Solution:**
```javascript
// ❌ Don't use:
const path = require('path');

// ✅ Use:
import path from 'path';
```

#### Error: "__dirname is not defined"

**Problem:** `__dirname` doesn't exist in ESM.

**Solution:**
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

#### Warning: "Could not resolve 'react'"

**Problem:** React not marked as external.

**Solution:** Add to `external` array in `build.js`:
```javascript
external: [
  'react',
  'react-dom',
  // ...
],
```

---

## Plugin API

### Load Function

Called when plugin is loaded into Bookbag. Use for:
- Registering hooks
- Registering views
- Registering client components
- Loading routes

```javascript
async function load(pluginAPI) {
  const { hookService, HOOKS, registerView, registerClientComponent } = pluginAPI;

  // Your plugin initialization code
}
```

### Activate Function

Called when plugin is first activated. Use for:
- Installing dependencies (if not pre-bundled)
- Running database migrations
- Creating directories
- Initial setup

```javascript
async function activate(pluginAPI) {
  // One-time setup tasks
  return { success: true, message: 'Activated successfully' };
}
```

### Deactivate Function

Called when plugin is deactivated. Use for:
- Cleanup tasks
- Removing temporary files
- Unhooking from external services

```javascript
async function deactivate(pluginAPI) {
  // Cleanup tasks
  return { success: true, message: 'Deactivated successfully' };
}
```

### Available Hooks

See [HOOKS_DIRECTORY.md](hooks/HOOKS_DIRECTORY.md) for complete list of hooks.

Common hooks:
- `HOOKS.ADMIN_MENU` - Add menu items
- `HOOKS.PLUGIN_ACTIVATED` - React to plugin activation
- `HOOKS.CLIENT_SIDEBAR_COMPONENTS` - Register sidebar components
- `HOOKS.CHAT_MESSAGE_SENT` - Process chat messages

---

## Best Practices

### 1. Use ESM Syntax

Always use ESM imports/exports:

```javascript
// ✅ Good
import fs from 'fs';
export { load, activate, deactivate };

// ❌ Bad
const fs = require('fs');
module.exports = { load, activate, deactivate };
```

### 2. Mark Shared Libraries as External

Don't bundle React, UI libraries, or other shared code:

```javascript
// build.js
external: [
  'react',
  'react-dom',
  'lucide-react',
  'sonner',
  '@bookbag/sdk',
  'mastercontroller',
],
```

### 3. Keep Bundles Small

- Only bundle plugin-specific dependencies
- Use peer dependencies for shared libraries
- Enable minification for production
- Avoid large data files in bundle

### 4. Handle Errors Gracefully

```javascript
async function activate(pluginAPI) {
  try {
    // Setup code
    return { success: true, message: 'Success' };
  } catch (error) {
    console.error('Activation failed:', error);
    return { success: false, error: error.message };
  }
}
```

### 5. Use Semantic Versioning

Update version in `package.json` following [semver](https://semver.org/):

- `1.0.0` - Initial release
- `1.0.1` - Bug fix (patch)
- `1.1.0` - New feature (minor)
- `2.0.0` - Breaking change (major)

### 6. Document Your Plugin

Create a `README.md` in your plugin folder:

```markdown
# My Plugin

Brief description of what the plugin does.

## Features

- Feature 1
- Feature 2

## Configuration

How to configure the plugin.

## Dependencies

List any external services or requirements.

## Development

How to build and test the plugin.
```

### 7. Test Before Publishing

```bash
# Build the plugin
npm run build

# Restart Bookbag to load the plugin
# Test activation
# Test functionality
# Test deactivation
```

### 8. Version Control

Add to `.gitignore`:

```
node_modules/
dist/
*.log
.DS_Store
```

Only commit source files, not build artifacts.

---

## Example: Real-World Plugin

See `bb-plugins/rag-plugin/` for a complete, production-ready example plugin that:

- ✅ Uses ESM syntax throughout
- ✅ Bundles 7 dependencies (pdf-parse, mammoth, @xenova/transformers, etc.)
- ✅ Marks React and UI libraries as external
- ✅ Builds to 6.4kb bundle
- ✅ Includes database migrations
- ✅ Registers admin views and client components
- ✅ Implements all three lifecycle methods

Study this plugin as a reference implementation.

---

## Troubleshooting

### Plugin Not Loading

1. Check that `dist/plugin.js` exists
2. Verify ESM exports: `export { load, activate, deactivate }`
3. Check console for error messages
4. Verify plugin is in `bb-plugins/` directory

### Build Errors

1. Check `package.json` has `"type": "module"`
2. Verify all imports use ESM syntax
3. Check `external` array includes all shared libraries
4. Run `npm install` to ensure dependencies are installed

### Runtime Errors

1. Check that peer dependencies match Bookbag core versions
2. Verify `__dirname` is defined using `fileURLToPath`
3. Check that dynamic imports use `await import()`
4. Look for CommonJS syntax (require, module.exports)

---

## Next Steps

1. Create your plugin following the structure above
2. Build with `npm run build`
3. Test activation in Bookbag
4. Iterate and improve
5. Share with the community!

For more information, see:
- [HOOKS_DIRECTORY.md](hooks/HOOKS_DIRECTORY.md) - Complete hook reference
- [PLUGIN_ACTIVATION_SYSTEM.md](hooks/PLUGIN_ACTIVATION_SYSTEM.md) - Activation workflow
- [DYNAMIC_COMPONENT_LOADING.md](hooks/DYNAMIC_COMPONENT_LOADING.md) - Component system
