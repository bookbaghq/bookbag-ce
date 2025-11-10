
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema {
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);

        // Create TokenUsage table for detailed token tracking
        this.createTable(table.TokenUsage);

        // Create TokenSettings table for global limits and configuration
        this.createTable(table.TokenSettings);

        // Seed TokenSettings with default configuration
        this.seed('TokenSettings', {
            // Global token limits - disabled by default
            global_token_limit: null,
            global_limit_period: 'monthly',
            global_limit_enabled: 0,

            // Per-user token limits - disabled by default
            per_user_token_limit: null,
            per_user_limit_period: 'monthly',
            per_user_limit_enabled: 0,

            // Per-chat limits - disabled by default
            per_chat_token_limit: null,
            per_chat_limit_enabled: 0,

            // Rate limiting - disabled by default
            rate_limit_enabled: 0,
            rate_limit_requests: 100,
            rate_limit_window: 60,

            // Notification settings
            notify_on_limit_reached: 1,
            notify_threshold: 90,

            // Cost tracking - disabled by default
            track_costs: 0,
            currency: 'USD',

            // Timestamps
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });
    }

    down(table){
        this.init(table);

        this.droptable(table.TokenUsage);
        this.droptable(table.TokenSettings);
    }
}

module.exports = Init;
