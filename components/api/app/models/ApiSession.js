class ApiSession {

    // Primary Key
    id(db) {
        db.integer().primary().auto();
    }

    // API Association
    api_id(db) {
        db.integer().notNullable();
    }

    // Session Identifier
    session_id(db) {
        db.string().notNullable().unique();
    }

    // User Context (optional)
    user_id(db) {
        db.integer().nullable();
    }

    // Chat History - stored as JSON string
    messages(db) {
        db.string().nullable();
        db.get(function(value) {
            if (!value) return [];
            try {
                return JSON.parse(value);
            } catch (e) {
                return [];
            }
        });
        db.set(function(value) {
            if (Array.isArray(value)) {
                return JSON.stringify(value);
            }
            return value;
        });
    }

    // Session Metadata
    message_count(db) {
        db.integer().default(0);
    }

    total_tokens_used(db) {
        db.integer().default(0);
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

    // Last Activity
    last_activity_at(db) {
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

module.exports = ApiSession;
