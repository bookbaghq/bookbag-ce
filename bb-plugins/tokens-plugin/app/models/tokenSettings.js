/**
 * TokenSettings Model
 *
 * Global configuration for token limits and policies
 * Uses MasterRecord schema definition pattern
 */
class TokenSettings {
    id(db) {
        db.integer().primary().auto();
    }

    // Global token limits
    global_token_limit(db) {
        db.integer().nullable(); // Total tokens allowed across all users (null = unlimited)
    }

    global_limit_period(db) {
        db.string().default('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
    }

    global_limit_enabled(db) {
        db.integer().default(0); // Boolean: 0 = disabled, 1 = enabled
    }

    // Per-user token limits
    per_user_token_limit(db) {
        db.integer().nullable(); // Tokens per user (null = unlimited)
    }

    per_user_limit_period(db) {
        db.string().default('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
    }

    per_user_limit_enabled(db) {
        db.integer().default(0); // Boolean: 0 = disabled, 1 = enabled
    }

    // Per-chat limits
    per_chat_token_limit(db) {
        db.integer().nullable(); // Tokens per chat session (null = unlimited)
    }

    per_chat_limit_enabled(db) {
        db.integer().default(0); // Boolean: 0 = disabled, 1 = enabled
    }

    // Rate limiting
    rate_limit_enabled(db) {
        db.integer().default(0); // Boolean: 0 = disabled, 1 = enabled
    }

    rate_limit_requests(db) {
        db.integer().default(100); // Max requests per window
    }

    rate_limit_window(db) {
        db.integer().default(60); // Window in seconds
    }

    // Notification settings
    notify_on_limit_reached(db) {
        db.integer().default(1); // Send notification when limits are reached
    }

    notify_threshold(db) {
        db.integer().default(90); // Notify at X% of limit (e.g., 90%)
    }

    // Cost tracking
    track_costs(db) {
        db.integer().default(0); // Enable cost estimation
    }

    currency(db) {
        db.string().default('USD'); // Currency for cost tracking
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

module.exports = TokenSettings;
