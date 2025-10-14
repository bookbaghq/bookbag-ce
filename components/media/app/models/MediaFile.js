/**
 * MediaFile Model
 * Tracks uploaded files in the system
 */

class MediaFile {
  id(db) {
    db.integer().primary().auto();
  }

  filename(db) {
    db.string().notNullable();
  }

  stored_filename(db) {
    db.string().notNullable();
  }

  file_path(db) {
    db.string().notNullable();
  }

  mime_type(db) {
    db.string().nullable();
  }

  file_size(db) {
    db.integer().notNullable().default(0);
  }

  uploaded_by(db) {
    db.integer().nullable();
  }

  upload_source(db) {
    db.string().default('admin');
  }

  created_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }

  updated_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }
}

module.exports = MediaFile;
