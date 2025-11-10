# WordPress-Style Plugin Activation System

> **Version:** 0.0.14
> **Last Updated:** November 5, 2024
> **Status:** Production Ready

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Plugin Structure](#plugin-structure)
- [Activation Flow](#activation-flow)
- [API Reference](#api-reference)
- [Implementation Guide](#implementation-guide)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Bookbag's plugin activation system is modeled after WordPress, allowing plugins to be truly self-contained with:

- ✅ **Own dependencies** - Each plugin has its own `package.json` and `node_modules/`
- ✅ **Automatic installation** - `npm install` runs automatically on activation
- ✅ **Database migrations** - Migrations run automatically during activation
- ✅ **Setup tasks** - Create directories, initialize config, setup defaults
- ✅ **Cleanup tasks** - Run cleanup when plugin is deactivated
- ✅ **Hook system** - Fire `PLUGIN_ACTIVATED` and `PLUGIN_DEACTIVATED` hooks

---

## How It Works

### WordPress Equivalent

```php
// WordPress
register_activation_hook(__FILE__, 'my_plugin_activate');
register_deactivation_hook(__FILE__, 'my_plugin_deactivate');
```

### Bookbag Equivalent

```javascript
// Bookbag
async function activate(pluginAPI) {
  // Setup tasks
}

async function deactivate(pluginAPI) {
  // Cleanup tasks
}

module.exports = { load, activate, deactivate };
```

---

## Plugin Structure

```
bb-plugins/rag-plugin/
├── package.json                    ⭐ Plugin dependencies
├── node_modules/                   ⭐ Auto-created by activate()
├── index.js                        ⭐ Contains load(), activate(), deactivate()
├── config/
│   ├── routes.js
│   └── environments/               ⭐ Plugin-specific environment
│       ├── env.development.json
│       └── env.production.json
├── db/                             ⭐ Plugin-specific database
│   └── development.sqlite3
├── app/
│   ├── controllers/
│   ├── models/
│   │   ├── ragContext.js
│   │   └── db/migrations/          ⭐ Auto-run by activate()
│   └── services/
└── pages/
    ├── admin/
    └── client/
```

---

## Activation Flow

### 1. User Triggers Activation

**Via API:**
```bash
curl -X POST http://localhost:8080/api/plugins/activate \
  -H "Content-Type: application/json" \
  -d '{"name":"rag-plugin"}'
```

**Via Admin UI:**
- Navigate to `/bb-admin/plugins`
- Click "Activate" button on plugin card

---

### 2. System Loads Plugin

**Location:** `components/plugins/app/core/pluginLoader.js:activatePlugin()`

```javascript
async activatePlugin(pluginName) {
  // 1. Find plugin in database
  const plugin = pluginContext.Plugin.where(p => p.name == $, pluginName).single();

  // 2. Require plugin file
  const pluginModule = require(fullPath);

  // 3. Check for activate() method
  if (typeof pluginModule.activate !== 'function') {
    return { success: true, message: 'No activation tasks' };
  }

  // 4. Call activate() with pluginAPI
  const result = await pluginModule.activate(pluginAPI);

  return result;
}
```

---

### 3. Plugin's activate() Method Runs

**Example:** `bb-plugins/rag-plugin/index.js`

```javascript
async function activate(pluginAPI) {
  const path = require('path');
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  const fs = require('fs').promises;

  console.log('\n🔌 Activating RAG Plugin...');

  try {
    // 1. Install npm dependencies
    console.log('  📦 Installing plugin dependencies...');
    const pluginDir = path.join(__dirname);
    await execAsync('npm install', { cwd: pluginDir });
    console.log('  ✓ Plugin dependencies installed successfully');

    // 2. Run database migrations
    console.log('  🗄️  Running database migrations...');
    const master = require('mastercontroller');
    await execAsync(
      `cd ${master.root} && masterrecord update-database rag`
    );
    console.log('  ✓ Database migrations completed');

    // 3. Create necessary directories
    console.log('  📁 Creating plugin directories...');
    const directories = [
      path.join(master.root, 'storage/rag/documents'),
      path.join(master.root, 'storage/rag/vectors')
    ];
    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
    console.log('  ✓ Directories created');

    // 4. Fire PLUGIN_ACTIVATED hook
    await pluginAPI.hookService.doAction(
      pluginAPI.HOOKS.PLUGIN_ACTIVATED,
      { pluginName: 'rag-plugin', pluginPath: __dirname }
    );

    console.log('✓ RAG Plugin activated successfully!\n');
    return { success: true, message: 'RAG Plugin activated successfully' };
  } catch (error) {
    console.error('✗ RAG Plugin activation failed:', error.message);
    return { success: false, error: error.message };
  }
}
```

---

### 4. Response Returned

```json
{
  "success": true,
  "message": "RAG Plugin activated successfully"
}
```

---

## API Reference

### Plugin API Object

When `activate()` or `deactivate()` is called, it receives a `pluginAPI` object:

```javascript
const pluginAPI = {
  hookService: HookService,     // Hook service instance
  HOOKS: HOOKS,                 // Hook constants
  pluginLoader: PluginLoader,   // Plugin loader instance
  pluginPath: string            // Absolute path to plugin directory
};
```

---

### Activation Endpoints

#### Activate Plugin
```
POST /api/plugins/activate
Body: { "name": "plugin-name" }
Response: { "success": true, "message": "..." }
```

#### Deactivate Plugin
```
POST /api/plugins/deactivate
Body: { "name": "plugin-name" }
Response: { "success": true, "message": "..." }
```

---

## Implementation Guide

### Step 1: Create plugin/package.json

```json
{
  "name": "@bookbag/my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "main": "index.js",
  "private": true,
  "dependencies": {
    "some-library": "^1.0.0",
    "another-library": "^2.0.0"
  },
  "scripts": {
    "install": "echo 'Installing plugin dependencies...'",
    "postinstall": "echo 'Plugin dependencies installed successfully'"
  }
}
```

---

### Step 2: Add activate() Method

```javascript
// bb-plugins/my-plugin/index.js

async function activate(pluginAPI) {
  const path = require('path');
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  const fs = require('fs').promises;

  console.log('🔌 Activating My Plugin...');

  try {
    // Task 1: Install dependencies
    const pluginDir = __dirname;
    const packageJsonPath = path.join(pluginDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      console.log('  📦 Installing dependencies...');
      await execAsync('npm install', { cwd: pluginDir });
      console.log('  ✓ Dependencies installed');
    }

    // Task 2: Run migrations
    const master = require('mastercontroller');
    const migrationsPath = path.join(pluginDir, 'app/models/db/migrations');

    if (fs.existsSync(migrationsPath)) {
      console.log('  🗄️  Running migrations...');
      await execAsync(
        `cd ${master.root} && masterrecord update-database myplugin`
      );
      console.log('  ✓ Migrations completed');
    }

    // Task 3: Create directories
    console.log('  📁 Creating directories...');
    await fs.mkdir(path.join(master.root, 'storage/myplugin'), { recursive: true });
    console.log('  ✓ Directories created');

    // Task 4: Initialize config/data
    console.log('  ⚙️  Initializing configuration...');
    // Your custom initialization
    console.log('  ✓ Configuration initialized');

    // Task 5: Fire activation hook
    await pluginAPI.hookService.doAction(
      pluginAPI.HOOKS.PLUGIN_ACTIVATED,
      { pluginName: 'my-plugin', pluginPath: __dirname }
    );

    console.log('✓ My Plugin activated successfully!\n');
    return { success: true, message: 'My Plugin activated successfully' };
  } catch (error) {
    console.error('✗ My Plugin activation failed:', error.message);
    return { success: false, error: error.message };
  }
}
```

---

### Step 3: Add deactivate() Method

```javascript
async function deactivate(pluginAPI) {
  console.log('🔌 Deactivating My Plugin...');

  try {
    // Cleanup tasks (optional)
    // Note: Usually you don't delete data, just deactivate functionality

    // Fire deactivation hook
    await pluginAPI.hookService.doAction(
      pluginAPI.HOOKS.PLUGIN_DEACTIVATED,
      { pluginName: 'my-plugin', pluginPath: __dirname }
    );

    console.log('✓ My Plugin deactivated successfully!\n');
    return { success: true, message: 'My Plugin deactivated successfully' };
  } catch (error) {
    console.error('✗ My Plugin deactivation failed:', error.message);
    return { success: false, error: error.message };
  }
}
```

---

### Step 4: Export Methods

```javascript
module.exports = {
  load,        // Required: Called every server start
  activate,    // Optional: Called once on activation
  deactivate   // Optional: Called once on deactivation
};
```

---

## Examples

### Example 1: Simple Plugin (No Dependencies)

```javascript
// bb-plugins/simple-plugin/index.js

function load(pluginAPI) {
  console.log('Simple plugin loaded');
}

async function activate(pluginAPI) {
  console.log('Simple plugin activated');

  // Fire activation hook
  await pluginAPI.hookService.doAction(
    pluginAPI.HOOKS.PLUGIN_ACTIVATED,
    { pluginName: 'simple-plugin' }
  );

  return { success: true };
}

async function deactivate(pluginAPI) {
  console.log('Simple plugin deactivated');
  return { success: true };
}

module.exports = { load, activate, deactivate };
```

---

### Example 2: Plugin with Database Setup

```javascript
// bb-plugins/db-plugin/index.js

async function activate(pluginAPI) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  const master = require('mastercontroller');

  try {
    // Run migrations
    console.log('Running database migrations...');
    await execAsync(`cd ${master.root} && masterrecord update-database dbplugin`);

    // Seed initial data
    const DbPluginContext = require('./app/models/dbPluginContext');
    const ctx = new DbPluginContext();

    const setting = ctx.Setting.new();
    setting.key = 'initialized';
    setting.value = 'true';
    ctx.Setting.track(setting);
    ctx.saveChanges();

    console.log('Database setup complete');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { load, activate, deactivate };
```

---

### Example 3: Plugin with External API Setup

```javascript
// bb-plugins/api-plugin/index.js

async function activate(pluginAPI) {
  const axios = require('axios');
  const fs = require('fs').promises;
  const path = require('path');

  try {
    // Install dependencies
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    console.log('Installing API client...');
    await execAsync('npm install', { cwd: __dirname });

    // Verify API connection
    console.log('Verifying API connection...');
    const response = await axios.get('https://api.example.com/health');
    if (response.status !== 200) {
      throw new Error('API not reachable');
    }

    // Save API key template
    const configPath = path.join(__dirname, 'config/api-key.json');
    await fs.writeFile(configPath, JSON.stringify({
      apiKey: 'YOUR_API_KEY_HERE',
      endpoint: 'https://api.example.com'
    }, null, 2));

    console.log('API plugin activated. Please configure your API key.');

    return {
      success: true,
      message: 'Please configure API key in config/api-key.json'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { load, activate, deactivate };
```

---

## Best Practices

### ✅ DO

1. **Always return a result object**
```javascript
return { success: true, message: 'Activated successfully' };
return { success: false, error: 'Something failed' };
```

2. **Use try-catch for error handling**
```javascript
try {
  // Activation tasks
} catch (error) {
  return { success: false, error: error.message };
}
```

3. **Check for file existence before operations**
```javascript
if (fs.existsSync(packageJsonPath)) {
  await execAsync('npm install', { cwd: pluginDir });
}
```

4. **Fire activation hook at the end**
```javascript
await pluginAPI.hookService.doAction(
  pluginAPI.HOOKS.PLUGIN_ACTIVATED,
  { pluginName: 'my-plugin' }
);
```

5. **Log progress for debugging**
```javascript
console.log('  📦 Installing dependencies...');
console.log('  ✓ Dependencies installed');
```

---

### ❌ DON'T

1. **Don't delete user data on deactivation**
```javascript
// ❌ Bad
async function deactivate(pluginAPI) {
  await fs.rm(path.join(master.root, 'storage/myplugin'), { recursive: true });
}

// ✅ Good
async function deactivate(pluginAPI) {
  // Just cleanup temp files, keep user data
  await fs.rm(path.join(master.root, 'temp/myplugin'), { recursive: true });
}
```

2. **Don't use synchronous operations**
```javascript
// ❌ Bad
function activate() {
  execSync('npm install');
}

// ✅ Good
async function activate() {
  await execAsync('npm install');
}
```

3. **Don't throw errors without catching**
```javascript
// ❌ Bad
async function activate() {
  await execAsync('npm install'); // Can throw
}

// ✅ Good
async function activate() {
  try {
    await execAsync('npm install');
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## Troubleshooting

### Issue: npm install fails

**Symptom:**
```
Error: npm install failed
```

**Solution:**
```javascript
// Add better error handling
try {
  const { stdout, stderr } = await execAsync('npm install', {
    cwd: pluginDir,
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log(stdout);
} catch (error) {
  console.error('npm install failed:', error.message);
  console.error('stderr:', error.stderr);
  return { success: false, error: `npm install failed: ${error.message}` };
}
```

---

### Issue: Migrations don't run

**Symptom:**
```
Error: masterrecord command not found
```

**Solution:**
```javascript
// Use absolute path to masterrecord
const master = require('mastercontroller');
const masterrecordPath = path.join(master.root, 'node_modules/.bin/masterrecord');

await execAsync(
  `cd ${master.root} && ${masterrecordPath} update-database myplugin`
);
```

---

### Issue: Plugin database not found

**Symptom:**
```
Error: could not find env file
```

**Solution:**
```javascript
// Use absolute path in ragContext.js
const path = require('path');

class ragContext extends masterrecord.context {
  constructor() {
    super();

    // Use absolute path
    const pluginEnvPath = path.join(__dirname, '../../config/environments');
    this.env(pluginEnvPath);
  }
}
```

---

## Related Documentation

- [Hooks Directory](./HOOKS_DIRECTORY.md)
- [Hooks Changelog](./HOOKS_CHANGELOG.md)
- [Dynamic Component Loading](./DYNAMIC_COMPONENT_LOADING.md)
- [Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)

---

**Last Updated:** November 5, 2024
**Questions?** File an issue at [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
