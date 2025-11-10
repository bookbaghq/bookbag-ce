/**
 * Plugin Builder - Builds plugin bundles for runtime loading
 *
 * Each plugin's frontend code is bundled into a self-contained ES module
 * that can be dynamically loaded at runtime without rebuilding Next.js.
 */

const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');

class PluginBuilder {
  constructor() {
    this.rootDir = path.join(__dirname, '../../../../');
    this.pluginsDir = path.join(this.rootDir, 'bb-plugins');
  }

  /**
   * Build a single plugin's frontend bundle
   * @param {string} pluginName - Name of plugin (e.g., 'rag-plugin')
   * @param {Object} options - Build options
   */
  async buildPlugin(pluginName, options = {}) {
    const pluginPath = path.join(this.pluginsDir, pluginName);
    const nextjsPath = path.join(pluginPath, 'nextjs');

    if (!fs.existsSync(nextjsPath)) {
      console.log(`  ℹ  No nextjs/ directory found for ${pluginName}, skipping...`);
      return { success: true, skipped: true };
    }

    console.log(`  🔨 Building ${pluginName}...`);

    try {
      // Build admin bundle if admin entry exists
      const adminEntry = this.findEntry(nextjsPath, 'admin');
      if (adminEntry) {
        await this.buildBundle({
          pluginName,
          entryPoint: adminEntry,
          outputFile: path.join(pluginPath, 'dist/admin.js'),
          format: 'esm'
        });
        console.log(`     ✓ Admin bundle built`);
      }

      // Build client bundle if client entry exists
      const clientEntry = this.findEntry(nextjsPath, 'client');
      if (clientEntry) {
        await this.buildBundle({
          pluginName,
          entryPoint: clientEntry,
          outputFile: path.join(pluginPath, 'dist/client.js'),
          format: 'esm'
        });
        console.log(`     ✓ Client bundle built`);
      }

      if (!adminEntry && !clientEntry) {
        console.log(`     ℹ  No entry points found (admin.js or client.js)`);
      }

      return { success: true };

    } catch (error) {
      console.error(`     ✗ Build failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find entry point file for bundle
   */
  findEntry(basePath, type) {
    const possiblePaths = [
      path.join(basePath, `${type}.js`),
      path.join(basePath, `${type}.jsx`),
      path.join(basePath, `${type}/index.js`),
      path.join(basePath, `${type}/index.jsx`)
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Build an ES module bundle using esbuild
   */
  async buildBundle({ pluginName, entryPoint, outputFile, format = 'esm' }) {
    // Ensure dist directory exists
    const distDir = path.dirname(outputFile);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Next.js app directory for resolving @/ aliases
    const nextjsAppDir = path.join(this.rootDir, 'nextjs-app', 'app');

    await build({
      entryPoints: [entryPoint],
      bundle: true,
      format: format,
      outfile: outputFile,
      platform: 'browser',
      target: ['es2020'],
      jsx: 'automatic',
      jsxDev: false,
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV !== 'production',
      // Keep Next.js external since it's provided by the host Next.js app
      // The plugin loads within Next.js context where these modules are available
      external: ['next', 'next/*'],
      // Resolve @/ aliases to nextjs-app paths
      alias: {
        '@/components': path.join(this.rootDir, 'nextjs-app', 'components'),
        '@/lib': path.join(this.rootDir, 'nextjs-app', 'lib'),
        '@/hooks': path.join(this.rootDir, 'nextjs-app', 'hooks'),
        '@/utils': path.join(this.rootDir, 'nextjs-app', 'utils'),
        '@/context': path.join(this.rootDir, 'nextjs-app', 'context'),
        '@': this.rootDir + '/nextjs-app'
      },
      // Define globals
      define: {
        'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'development'}"`
      },
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx',
        '.ts': 'tsx',
        '.tsx': 'tsx',
        '.json': 'json'
      },
      logLevel: 'error'
    });
  }

  /**
   * Build all plugins
   */
  async buildAllPlugins() {
    const pluginDirs = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📦 Building ${pluginDirs.length} plugin(s)...\n`);

    const results = [];
    for (const pluginName of pluginDirs) {
      const result = await this.buildPlugin(pluginName);
      results.push({ pluginName, ...result });
    }

    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n✅ Build complete: ${successful} built, ${skipped} skipped, ${failed} failed`);

    return {
      success: failed === 0,
      results
    };
  }

  /**
   * Watch mode for development
   */
  async watchPlugin(pluginName) {
    console.log(`👀 Watching ${pluginName} for changes...`);
    // TODO: Implement watch mode using esbuild's watch API
    throw new Error('Watch mode not yet implemented');
  }
}

// Export singleton instance
module.exports = new PluginBuilder();

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  const pluginName = process.argv[3];

  const builder = new PluginBuilder();

  (async () => {
    try {
      if (command === 'build' && pluginName) {
        await builder.buildPlugin(pluginName);
      } else if (command === 'build-all' || command === 'build') {
        await builder.buildAllPlugins();
      } else if (command === 'watch' && pluginName) {
        await builder.watchPlugin(pluginName);
      } else {
        console.log('Usage:');
        console.log('  node pluginBuilder.js build [plugin-name]    - Build specific plugin or all');
        console.log('  node pluginBuilder.js build-all              - Build all plugins');
        console.log('  node pluginBuilder.js watch [plugin-name]    - Watch plugin for changes');
        process.exit(1);
      }
    } catch (error) {
      console.error('Build error:', error);
      process.exit(1);
    }
  })();
}
