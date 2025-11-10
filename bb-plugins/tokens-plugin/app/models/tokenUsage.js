/**
 * TokenUsage Model
 *
 * Tracks detailed token usage for each LLM request/response
 * Stores timing metrics, costs, and performance data
 * Uses MasterRecord schema definition pattern
 */
class TokenUsage {
    id(db) {
        db.integer().primary().auto();
    }

    chat_id(db) {
        db.integer().nullable();
    }

    message_id(db) {
        db.integer().nullable();
    }

    user_id(db) {
        db.integer().nullable();
    }

    model_id(db) {
        db.integer().nullable();
    }

    model_name(db) {
        db.string().nullable();
    }

    provider(db) {
        db.string().nullable();
    }

    // Token counts
    prompt_tokens(db) {
        db.integer().default(0);
    }

    completion_tokens(db) {
        db.integer().default(0);
    }

    total_tokens(db) {
        db.integer().default(0);
    }

    // Timing metrics
    request_start_time(db) {
        db.integer().nullable(); // Unix timestamp (ms)
    }

    request_end_time(db) {
        db.integer().nullable(); // Unix timestamp (ms)
    }

    duration_ms(db) {
        db.integer().nullable(); // Total duration in milliseconds
    }

    tokens_per_second(db) {
        db.integer().nullable(); // Tokens generated per second
    }

    // Cost tracking (optional, can be calculated based on model pricing)
    estimated_cost(db) {
        db.integer().nullable(); // Estimated cost in USD
    }

    // Request metadata
    workspace_id(db) {
        db.integer().nullable();
    }

    session_id(db) {
        db.string().nullable();
    }

    request_metadata(db) {
        db.string().nullable(); // JSON string for additional data
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
}

module.exports = TokenUsage;
