/**
 * MediaSettings Model
 * Stores media storage configuration and limits
 */

class MediaSettings {
  id(db) {
    db.integer().primary().auto();
  }

  storage_limit_mb(db) {
    db.integer().default(1024); // Default 1GB
  }

  storage_enabled(db) {
    db.boolean().default(true);
  }

  created_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now());
  }

  updated_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now());
  }
}

module.exports = MediaSettings;
