class Api {

    // Primary Key
    id(db) {
        db.integer().primary().auto();
    }

    // API Information
    name(db) {
        db.string().notNullable();
    }

    description(db) {
        db.string().nullable();
    }

    // Model Configuration
    model_id(db) {
        db.integer().nullable();
    }

    model_name(db) {
        db.string().nullable();
    }

    // Authentication
    api_key(db) {
        db.string().notNullable().unique();
    }

    // User Association
    user_id(db) {
        db.integer().nullable();
    }

    // Session Configuration
    session_limit(db) {
        db.integer().nullable();
    }

    max_messages_per_session(db) {
        db.integer().nullable();
    }

    // Rate Limiting
    rate_limit_requests(db) {
        db.integer().default(100);
    }

    rate_limit_window(db) {
        db.integer().default(60); // seconds
    }

    // Status
    is_active(db) {
        db.integer().default(1);
        db.get(function(value) {
            return value === 1;
        });
        db.set(function(value) {
            return value ? 1 : 0;
        });
    }

    // Usage Statistics
    total_requests(db) {
        db.integer().default(0);
    }

    last_used_at(db) {
        db.string().nullable();
    }

    // Timestamps
    created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }

    updated_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }
}

module.exports = Api;
