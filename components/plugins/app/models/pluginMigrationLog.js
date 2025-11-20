/**
 * PluginMigrationLog Model
 *
 * Tracks all plugin migration executions for audit trail and debugging
 */

class PluginMigrationLog {
  id(db) {
    db.integer().primary().auto();
  }

  plugin(db) {
    db.string().notNullable();
  }

  context(db) {
    db.string().notNullable();
  }

  ran_at(db) {
    db.string().notNullable();
    db.get(v => v || Date.now().toString());
  }

  status(db) {
    db.string().default('success');
  }

  error_message(db) {
    db.string().nullable();
  }

  stdout(db) {
    db.string().nullable();
  }

  stderr(db) {
    db.string().nullable();
  }
}

module.exports = PluginMigrationLog;
