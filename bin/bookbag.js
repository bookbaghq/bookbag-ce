#!/usr/bin/env node

/**
 * Bookbag CLI - Command line interface for Bookbag operations
 *
 * Usage:
 *   bookbag build-plugin <plugin-name|plugin-path>
 *   bookbag build-plugins
 */

const path = require('path');
const fs = require('fs');

// Get project root (assuming bin/ is at project root)
const projectRoot = path.join(__dirname, '..');
const pluginBuilder = require(path.join(projectRoot, 'components/plugins/app/core/pluginBuilder.js'));

// Parse command and arguments
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  try {
    switch (command) {
      case 'build-plugin': {
        if (!arg) {
          console.error('Error: Plugin name or path required');
          console.log('Usage: bookbag build-plugin <plugin-name|plugin-path>');
          process.exit(1);
        }

        // Determine if arg is a path or plugin name
        let pluginName;

        if (arg.includes('/') || arg.includes('\\')) {
          // It's a path - extract plugin name
          const absolutePath = path.resolve(arg);
          pluginName = path.basename(absolutePath);

          // Verify it's actually a plugin directory
          const pluginJsonPath = path.join(absolutePath, 'plugin.json');
          if (!fs.existsSync(pluginJsonPath)) {
            console.error(`Error: ${absolutePath} does not appear to be a valid plugin directory`);
            console.error('Expected to find plugin.json');
            process.exit(1);
          }
        } else {
          // It's a plugin name
          pluginName = arg;
        }

        console.log(`\n📦 Building plugin: ${pluginName}\n`);
        const result = await pluginBuilder.buildPlugin(pluginName);

        if (result.success) {
          if (result.skipped) {
            console.log(`\n⚠️  Skipped: No nextjs/ directory found\n`);
          } else {
            console.log(`\n✅ Plugin built successfully!\n`);
          }
          process.exit(0);
        } else {
          console.error(`\n❌ Build failed: ${result.error}\n`);
          process.exit(1);
        }
        break;
      }

      case 'build-plugins': {
        console.log(`\n📦 Building all plugins...\n`);
        const result = await pluginBuilder.buildAllPlugins();

        if (result.success) {
          console.log(`\n✅ All plugins built successfully!\n`);
          process.exit(0);
        } else {
          console.error(`\n❌ Some plugins failed to build\n`);
          process.exit(1);
        }
        break;
      }

      case 'help':
      case '--help':
      case '-h':
      default: {
        console.log(`
Bookbag CLI - Command line interface for Bookbag

Usage:
  bookbag build-plugin <plugin-name|plugin-path>   Build a specific plugin
  bookbag build-plugins                             Build all plugins
  bookbag help                                      Show this help message

Examples:
  bookbag build-plugin rag-plugin
  bookbag build-plugin ./bb-plugins/rag-plugin
  bookbag build-plugins
`);
        process.exit(command ? 0 : 1);
      }
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
