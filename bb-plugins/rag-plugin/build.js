#!/usr/bin/env node

/**
 * Plugin Build Script
 *
 * Bundles the plugin and its dependencies into a single dist/plugin.js file.
 * Shared libraries (React, UI components) are marked as external and provided by Bookbag core.
 *
 * Usage: npm run build
 */

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

console.log('🔨 Building RAG Plugin...');

try {
  await build({
    entryPoints: [join(__dirname, 'index.js')],
    outfile: join(distDir, 'plugin.js'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',

    // Mark shared dependencies as external - provided by Bookbag core
    external: [
      'react',
      'react-dom',
      'lucide-react',
      'sonner',
      '@bookbag/sdk',
      'mastercontroller',
      // Any other shared UI/core libraries
    ],

    // Bundle plugin-specific dependencies
    // mammoth, pdf-parse, @xenova/transformers, etc. will be bundled

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
