/**
 * Setting Model
 * Manages plugin/feature toggle settings
 */

class Setting {
  id(db) {
    db.integer().primary().auto();
  }

  disable_client_side(db) {
    db.boolean().default(false);
  }

  // Plugin upload maximum file size in bytes (default: 104857600 = 100MB)
  plugin_upload_max_file_size(db) {
    db.integer().default(104857600);
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

module.exports = Setting;
