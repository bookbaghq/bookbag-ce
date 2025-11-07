# Dependency Compilation Quick Reference

## Overview

This guide explains how Bookbag plugins compile and bundle their dependencies using esbuild.

## Quick Start

```bash
# Install dependencies
npm install

# Build plugin (bundles dependencies)
npm run build

# Output: dist/plugin.js (contains your code + bundled dependencies)
```

---

## Dependency Types

### 1. Bundled Dependencies (Regular)

**Added to:** `dependencies` in package.json
**Compilation:** Included in `dist/plugin.js`
**Use for:** Plugin-specific libraries

```bash
npm install pdf-parse --save
```

```json
{
  "dependencies": {
    "pdf-parse": "^2.3.0"
  }
}
```

**Result:** pdf-parse code is bundled into `dist/plugin.js`

### 2. External Dependencies (Shared)

**Added to:** `peerDependencies` in package.json
**Compilation:** NOT included in bundle
**Use for:** Shared libraries (React, UI components)

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "lucide-react": "^0.485.0"
  }
}
```

**Must also add to `build.js`:**

```javascript
external: [
  'react',
  'lucide-react',
],
```

**Result:** These are provided by Bookbag core at runtime

---

## How Bundling Works

### Input: Multiple Files + Dependencies

```
index.js (your code)
  ├── import React from 'react'         → External (not bundled)
  ├── import { toast } from 'sonner'    → External (not bundled)
  ├── import pdfParse from 'pdf-parse'  → Bundled ✓
  └── import mammoth from 'mammoth'     → Bundled ✓

node_modules/
  ├── react/              → Skipped (external)
  ├── sonner/             → Skipped (external)
  ├── pdf-parse/          → Bundled into dist/plugin.js
  │   └── dependencies/   → Also bundled
  └── mammoth/            → Bundled into dist/plugin.js
      └── dependencies/   → Also bundled
```

### Output: Single Bundle

```javascript
// dist/plugin.js (6-50kb typically)

// External imports (resolved at runtime)
import React from 'react';
import { toast } from 'sonner';

// Bundled code (included in this file)
var pdf_parse_code = /* ... */;
var mammoth_code = /* ... */;

// Your plugin code
async function load(pluginAPI) { /* ... */ }
export { load, activate, deactivate };
```

---

## Common Scenarios

### Scenario 1: Adding a PDF Parser

**Goal:** Add pdf-parse to process PDF files

```bash
# 1. Install as regular dependency
npm install pdf-parse --save

# 2. Use in your code
import pdfParse from 'pdf-parse';

async function parsePDF(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

# 3. Build (pdf-parse will be bundled)
npm run build
```

**Result:**
- ✅ pdf-parse bundled into dist/plugin.js
- ✅ Plugin works without user installing pdf-parse

### Scenario 2: Using React Components

**Goal:** Use React and lucide-react icons

```bash
# 1. Install as peer dependency
npm install react lucide-react --save-peer
```

```javascript
// 2. Add to build.js external array
external: [
  'react',
  'react-dom',
  'lucide-react',
],
```

```javascript
// 3. Use in your code
import React from 'react';
import { FileText } from 'lucide-react';

export function MyComponent() {
  return <FileText size={24} />;
}

# 4. Build (React and lucide-react NOT bundled)
npm run build
```

**Result:**
- ✅ React provided by Bookbag core
- ✅ lucide-react provided by Bookbag core
- ✅ Smaller bundle size
- ✅ Consistent versions across all plugins

### Scenario 3: Using Node.js Built-ins

**Goal:** Use fs, path, crypto, etc.

```javascript
// These are automatically handled by esbuild
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// No need to install or mark as external
// They're built into Node.js
```

**Result:**
- ✅ Automatically available
- ✅ Not bundled (use Node.js built-ins)

### Scenario 4: Large ML Models

**Goal:** Use @xenova/transformers for embeddings

```bash
# 1. Install as regular dependency
npm install @xenova/transformers --save

# 2. Use in your code
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'model-name');

# 3. Build
npm run build
```

**Note:** This may create a large bundle (50-100kb+). Consider:
- Lazy loading: `const { pipeline } = await import('@xenova/transformers')`
- Split into separate module if too large
- Use server-side processing instead

---

## Build Configuration

### Basic build.js

```javascript
import { build } from 'esbuild';

await build({
  entryPoints: ['index.js'],
  outfile: 'dist/plugin.js',
  bundle: true,                    // Bundle dependencies
  format: 'esm',                   // Use ESM format
  platform: 'node',                // Target Node.js
  target: 'node18',                // Node 18+ features

  // What NOT to bundle
  external: [
    'react',
    'react-dom',
    'lucide-react',
    'sonner',
    '@bookbag/sdk',
    'mastercontroller',
  ],

  sourcemap: true,                 // Generate source maps
  minify: false,                   // Minify for production
});
```

### Advanced Configuration

```javascript
await build({
  // ... basic config

  // Minification (production)
  minify: process.env.NODE_ENV === 'production',

  // Preserve comments
  legalComments: 'inline',

  // Tree shaking (remove unused code)
  treeShaking: true,

  // Analyze bundle
  metafile: true,

  // Custom loader for special file types
  loader: {
    '.txt': 'text',
    '.sql': 'text',
  },

  // Define environment variables
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
```

---

## Dependency Decision Tree

```
Need to use a library?
│
├─ Is it React, React DOM, or a UI library?
│  └─ YES → peerDependencies + external array
│
├─ Is it provided by Bookbag core?
│  └─ YES → peerDependencies + external array
│
├─ Is it a Node.js built-in? (fs, path, crypto)
│  └─ YES → Just import it (no install needed)
│
├─ Is it MasterController or @bookbag/sdk?
│  └─ YES → peerDependencies + external array
│
└─ Is it plugin-specific?
   └─ YES → Regular dependencies (will be bundled)
```

---

## Checking What's Bundled

### View Bundle Contents

```bash
# See what's in the bundle
cat dist/plugin.js | grep "import.*from"

# Check bundle size
ls -lh dist/plugin.js

# Search for specific package
grep -n "pdf-parse" dist/plugin.js
```

### Generate Bundle Analysis

Update `build.js`:

```javascript
const result = await build({
  // ... config
  metafile: true,
});

// Analyze what's bundled
console.log(await esbuild.analyzeMetafile(result.metafile));
```

Output:
```
dist/plugin.js  15.2kb  100.0%
  index.js       2.1kb   13.8%
  pdf-parse/     8.3kb   54.6%
  mammoth/       4.8kb   31.6%
```

---

## Common Issues

### Issue 1: Bundle Too Large

**Problem:** dist/plugin.js is 500kb+

**Solutions:**

1. **Check what's bundled:**
   ```bash
   ls -lh dist/plugin.js
   ```

2. **Move large libraries to external:**
   ```javascript
   external: [
     'react',
     'large-library', // Add here
   ],
   ```

3. **Use lazy loading:**
   ```javascript
   // Instead of:
   import heavyLib from 'heavy-library';

   // Use:
   const { heavyLib } = await import('heavy-library');
   ```

4. **Split into multiple plugins**

### Issue 2: "Module not found" at Runtime

**Problem:** Plugin loads but crashes with "Cannot find module 'react'"

**Solution:** React should be external, not bundled

```javascript
// build.js
external: [
  'react',  // Add this
],
```

```json
// package.json
{
  "peerDependencies": {
    "react": "^19.0.0"  // Add this
  }
}
```

### Issue 3: Different Version Needed

**Problem:** Need older version of a library

**Solution:** Specify exact version in dependencies

```json
{
  "dependencies": {
    "old-library": "1.2.3"  // Pin to specific version
  }
}
```

This gets bundled, so version conflicts don't matter.

### Issue 4: Native Modules

**Problem:** Package uses native Node.js addons (e.g., sqlite3)

**Solution:** These can't be bundled by esbuild

```javascript
external: [
  'sqlite3',  // Mark as external
],
```

User must install: `npm install sqlite3`

Or use pure JS alternatives (e.g., better-sqlite3 → sql.js)

---

## Bundle Size Guidelines

| Bundle Size | Status | Action |
|------------|--------|---------|
| < 10kb | ✅ Excellent | Ship it |
| 10-50kb | ✅ Good | Acceptable |
| 50-100kb | ⚠️ Large | Review dependencies |
| 100-500kb | ⚠️ Very Large | Consider splitting |
| > 500kb | ❌ Too Large | Must optimize |

### Optimization Tips

1. **Use external for shared libs**
2. **Lazy load heavy modules**
3. **Remove unused dependencies**
4. **Enable minification**
5. **Use tree shaking**

```javascript
// Before optimization
import * as lodash from 'lodash';  // Bundles entire lodash

// After optimization
import pick from 'lodash/pick';    // Bundles only pick function
```

---

## Testing Your Bundle

### 1. Build and Inspect

```bash
npm run build
ls -lh dist/plugin.js
```

### 2. Test Loading

```javascript
// test-load.js
import { load, activate } from './dist/plugin.js';

console.log('Exports:', { load, activate });
```

```bash
node test-load.js
```

### 3. Check for CommonJS

```bash
# Should return nothing
grep "module.exports" dist/plugin.js
grep "require(" dist/plugin.js
```

### 4. Verify External Imports

```bash
# Should find external imports
grep "import.*from.*react" dist/plugin.js
```

---

## Real Examples

### Example 1: RAG Plugin

**Bundle size:** 6.4kb

**Dependencies:**
- ✅ Bundled: pdf-parse, mammoth, @xenova/transformers, cheerio
- ✅ External: react, lucide-react, sonner, mastercontroller

**Why it works:**
- Heavy lifting (PDF/Word parsing, ML) bundled
- UI libraries (React, icons) external
- Small footprint despite 7 dependencies

### Example 2: Analytics Plugin

**Bundle size:** 3.2kb

**Dependencies:**
- ✅ Bundled: date-fns (only used functions)
- ✅ External: react, recharts

**Why it works:**
- Tree shaking removes unused date-fns code
- Chart library (recharts) provided by core
- Minimal bundle size

---

## Cheat Sheet

```bash
# Add bundled dependency
npm install package-name --save

# Add external dependency
npm install package-name --save-peer
# + Add to external array in build.js

# Build plugin
npm run build

# Check bundle size
ls -lh dist/plugin.js

# View what's imported
grep "import.*from" dist/plugin.js

# Clean build
rm -rf dist/ && npm run build
```

---

## Summary

| Dependency Type | package.json | build.js | Result |
|----------------|--------------|----------|--------|
| Plugin-specific | `dependencies` | - | Bundled |
| Shared library | `peerDependencies` | `external` | Not bundled |
| Node.js built-in | - | - | Available |
| Native addon | `dependencies` | `external` | User installs |

**Golden Rule:** If it's shared across plugins (React, UI libs), make it external. If it's unique to your plugin, bundle it.
