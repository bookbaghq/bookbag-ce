/**
 * Plugin Model
 * Stores plugin metadata and activation status
 * Similar to WordPress wp_options.active_plugins
 */

class Plugin {
  id(db) {
    db.integer().primary().auto();
  }

  // Unique plugin name (e.g., 'rag-plugin', 'media-plugin')
  name(db) {
    db.string().notNullable().unique();
  }

  // Display label
  label(db) {
    db.string().notNullable();
  }

  // Description
  description(db) {
    db.string().nullable();
  }

  // File path relative to bb-plugins/ (e.g., 'rag-plugin/index.js')
  // If not specified, defaults to '<plugin-name>/index.js'
  file_path(db) {
    db.string().nullable();
  }

  // Method name to call on the loaded plugin file (e.g., 'load')
  // If not specified, defaults to 'load'
  method_name_to_load(db) {
    db.string().nullable().default("load");
  }

  // Whether plugin is active
  is_active(db) {
    db.boolean().default(true);
  }

  // Display priority/order
  priority(db) {
    db.integer().default(10);
  }

  // Icon name for UI
  icon(db) {
    db.string().nullable();
  }

  // Category (core, plugin, integration)
  category(db) {
    db.string().default('plugin');
  }

  // Version
  version(db) {
    db.string().default('1.0.0');
  }

  // Author
  author(db) {
    db.string().nullable();
  }

  // Creation timestamp
  created_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }

  // Last update timestamp
  updated_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }
}

module.exports = Plugin;
