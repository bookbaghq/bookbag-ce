/**
 * Plugin Discovery Service
 * WordPress-style plugin discovery system
 *
 * Scans /bb-plugins directory for plugins and reads their metadata from:
 * 1. plugin.json manifest file (preferred)
 * 2. Header comments in entry file (WordPress-style)
 * 3. Defaults if neither is found
 */

const fs = require('fs');
const path = require('path');

class PluginDiscovery {
  constructor(pluginsDir) {
    this.pluginsDir = pluginsDir || path.join(require('mastercontroller').root, 'bb-plugins');
  }

  /**
   * Scan all plugins in /bb-plugins directory
   * @returns {Array} Array of plugin metadata objects
   */
  discoverPlugins() {
    const plugins = [];

    try {
      // Skip if directory doesn't exist
      if (!fs.existsSync(this.pluginsDir)) {
        console.warn(`  ⚠ Plugins directory not found: ${this.pluginsDir}`);
        return plugins;
      }

      // Get all subdirectories in /bb-plugins
      const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
      const pluginDirs = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name);

      // Discover each plugin
      for (const pluginDir of pluginDirs) {
        try {
          const pluginPath = path.join(this.pluginsDir, pluginDir);
          const metadata = this.discoverPlugin(pluginPath, pluginDir);

          if (metadata) {
            plugins.push(metadata);
          }
        } catch (error) {
          console.warn(`  ⚠ Failed to discover plugin "${pluginDir}":`, error.message);
        }
      }

      return plugins;
    } catch (error) {
      console.error('  ✗ Plugin discovery failed:', error.message);
      return [];
    }
  }

  /**
   * Discover a single plugin's metadata
   * @param {string} pluginPath - Absolute path to plugin directory
   * @param {string} pluginDir - Plugin directory name
   * @returns {Object|null} Plugin metadata or null if invalid
   */
  discoverPlugin(pluginPath, pluginDir) {
    // Try plugin.json first (WordPress-style manifest)
    const manifestPath = path.join(pluginPath, 'plugin.json');
    if (fs.existsSync(manifestPath)) {
      return this.readManifest(manifestPath, pluginPath, pluginDir);
    }

    // Try to find header comments in JS files (WordPress-style)
    const entryFile = this.findEntryFile(pluginPath);
    if (entryFile) {
      const headerMetadata = this.parseHeaderComments(path.join(pluginPath, entryFile));
      if (headerMetadata) {
        return {
          ...headerMetadata,
          slug: pluginDir,
          entry: entryFile,
          path: pluginPath
        };
      }
    }

    // Use defaults (for minimal plugins)
    return this.createDefaultMetadata(pluginDir, pluginPath);
  }

  /**
   * Read and parse plugin.json manifest
   * @param {string} manifestPath - Path to plugin.json
   * @param {string} pluginPath - Plugin directory path
   * @param {string} pluginDir - Plugin directory name
   * @returns {Object} Plugin metadata
   */
  readManifest(manifestPath, pluginPath, pluginDir) {
    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      return {
        name: manifest.name || this.formatName(pluginDir),
        slug: manifest.slug || pluginDir,
        version: manifest.version || '1.0.0',
        description: manifest.description || '',
        author: manifest.author || '',
        entry: manifest.entry || 'index.js',
        category: manifest.category || 'plugin',
        icon: manifest.icon || null,
        priority: manifest.priority || 10,
        path: pluginPath
      };
    } catch (error) {
      console.warn(`  ⚠ Failed to parse plugin.json for "${pluginDir}":`, error.message);
      return this.createDefaultMetadata(pluginDir, pluginPath);
    }
  }

  /**
   * Parse WordPress-style header comments from entry file
   * @param {string} filePath - Path to JS file
   * @returns {Object|null} Parsed metadata or null
   */
  parseHeaderComments(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Look for WordPress-style header comment block at the top of the file
      // Example:
      // /**
      //  * Plugin Name: My Plugin
      //  * Plugin Slug: my-plugin
      //  * Description: My plugin description
      //  * Version: 1.0.0
      //  * Author: John Doe
      //  * ...
      //  */
      const headerRegex = /^\/\*\*([\s\S]*?)\*\//m;
      const match = content.match(headerRegex);

      if (!match) return null;

      const headerBlock = match[1];
      const metadata = {};

      // Parse each line in the header
      const lines = headerBlock.split('\n');
      for (const line of lines) {
        // Match pattern: * Key: Value
        const lineMatch = line.match(/^\s*\*\s*([A-Za-z\s]+):\s*(.+?)\s*$/);
        if (lineMatch) {
          const key = lineMatch[1].trim();
          const value = lineMatch[2].trim();

          // Map WordPress-style keys to our format
          switch (key) {
            case 'Plugin Name':
              metadata.name = value;
              break;
            case 'Plugin Slug':
              metadata.slug = value;
              break;
            case 'Description':
              metadata.description = value;
              break;
            case 'Version':
              metadata.version = value;
              break;
            case 'Author':
              metadata.author = value;
              break;
            case 'Entry':
              metadata.entry = value;
              break;
            case 'Category':
              metadata.category = value;
              break;
            case 'Icon':
              metadata.icon = value;
              break;
            case 'Priority':
              metadata.priority = parseInt(value) || 10;
              break;
          }
        }
      }

      // Return metadata if we found a Plugin Name (required)
      return metadata.name ? metadata : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find entry file in plugin directory
   * @param {string} pluginPath - Plugin directory path
   * @returns {string|null} Entry file name or null
   */
  findEntryFile(pluginPath) {
    // Try common entry file names
    const candidates = ['index.js', 'plugin.js', 'main.js'];

    for (const candidate of candidates) {
      if (fs.existsSync(path.join(pluginPath, candidate))) {
        return candidate;
      }
    }

    // Look for any .js file in the root
    const files = fs.readdirSync(pluginPath);
    const jsFiles = files.filter(f => f.endsWith('.js') && !f.startsWith('.'));

    return jsFiles.length > 0 ? jsFiles[0] : null;
  }

  /**
   * Create default metadata for a plugin
   * @param {string} pluginDir - Plugin directory name
   * @param {string} pluginPath - Plugin directory path
   * @returns {Object} Default metadata
   */
  createDefaultMetadata(pluginDir, pluginPath) {
    return {
      name: this.formatName(pluginDir),
      slug: pluginDir,
      version: '1.0.0',
      description: '',
      author: '',
      entry: 'index.js',
      category: 'plugin',
      icon: null,
      priority: 10,
      path: pluginPath
    };
  }

  /**
   * Format plugin directory name to human-readable name
   * @param {string} dirName - Directory name (e.g., 'rag-plugin')
   * @returns {string} Formatted name (e.g., 'RAG Plugin')
   */
  formatName(dirName) {
    return dirName
      .replace(/-plugin$/, '')  // Remove '-plugin' suffix
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Plugin';
  }

  /**
   * Get metadata for a specific plugin
   * @param {string} pluginSlug - Plugin slug (directory name)
   * @returns {Object|null} Plugin metadata or null
   */
  getPluginMetadata(pluginSlug) {
    const pluginPath = path.join(this.pluginsDir, pluginSlug);

    if (!fs.existsSync(pluginPath)) {
      return null;
    }

    return this.discoverPlugin(pluginPath, pluginSlug);
  }
}

module.exports = PluginDiscovery;
