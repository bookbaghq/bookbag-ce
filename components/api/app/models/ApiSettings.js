class ApiSettings {

    // Primary Key (singleton)
    id(db) {
        db.integer().primary().auto();
    }

    // Global Rate Limits
    global_rate_limit_enabled(db) {
        db.integer().default(1);
    }

    global_rate_limit_requests(db) {
        db.integer().default(1000);
    }

    global_rate_limit_window(db) {
        db.integer().default(3600); // 1 hour in seconds
    }

    // Session Configuration
    default_session_limit(db) {
        db.integer().default(100);
    }

    default_max_messages_per_session(db) {
        db.integer().default(50);
    }

    session_expiration_hours(db) {
        db.integer().default(24);
    }

    // API Key Configuration
    api_key_prefix(db) {
        db.string().default('bb_');
    }

    api_key_length(db) {
        db.integer().default(32);
    }

    // Request Logging
    log_requests(db) {
        db.integer().default(1);
    }

    log_responses(db) {
        db.integer().default(0);
    }

    // Security
    require_https(db) {
        db.integer().default(0);
    }

    allowed_origins(db) {
        db.string().nullable(); // JSON array of allowed origins
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

module.exports = ApiSettings;
