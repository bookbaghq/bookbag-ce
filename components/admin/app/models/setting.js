/**
 * Setting Model
 * Manages plugin/feature toggle settings
 */

class Setting {
  id(db) {
    db.integer().primary().auto();
  }

  is_rag_active(db) {
    db.boolean().default(true);
  }

  is_mail_active(db) {
    db.boolean().default(true);
  }
  
  is_user_active(db) {
    db.boolean().default(true);
  }

  is_workspace_active(db) {
    db.boolean().default(true);
  }

  is_media_active(db) {
    db.boolean().default(true);
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
