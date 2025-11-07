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
