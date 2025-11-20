var masterrecord = require('masterrecord');

class InitMigration extends masterrecord.schema {
    constructor() {
        super();
    }

    async up() {
        // Create Api table
        await this.createTable('api', function(table) {
            table.id();
            table.string('name').notNullable();
            table.string('description').nullable();
            table.integer('model_id').nullable();
            table.string('model_name').nullable();
            table.string('api_key').notNullable().unique();
            table.integer('user_id').nullable();
            table.integer('session_limit').nullable();
            table.integer('max_messages_per_session').nullable();
            table.integer('rate_limit_requests').defaultTo(100);
            table.integer('rate_limit_window').defaultTo(60);
            table.integer('is_active').defaultTo(1);
            table.integer('total_requests').defaultTo(0);
            table.string('last_used_at').nullable();
            table.string('created_at').notNullable();
            table.string('updated_at').notNullable();
        });

        // Create ApiSession table
        await this.createTable('apisession', function(table) {
            table.id();
            table.integer('api_id').notNullable();
            table.string('session_id').notNullable().unique();
            table.integer('user_id').nullable();
            table.string('messages').nullable();
            table.integer('message_count').defaultTo(0);
            table.integer('total_tokens_used').defaultTo(0);
            table.integer('is_active').defaultTo(1);
            table.string('last_activity_at').nullable();
            table.string('created_at').notNullable();
            table.string('updated_at').notNullable();
        });

        // Create ApiSettings table
        await this.createTable('apisettings', function(table) {
            table.id();
            table.integer('global_rate_limit_enabled').defaultTo(1);
            table.integer('global_rate_limit_requests').defaultTo(1000);
            table.integer('global_rate_limit_window').defaultTo(3600);
            table.integer('default_session_limit').defaultTo(100);
            table.integer('default_max_messages_per_session').defaultTo(50);
            table.integer('session_expiration_hours').defaultTo(24);
            table.string('api_key_prefix').defaultTo('bb_');
            table.integer('api_key_length').defaultTo(32);
            table.integer('log_requests').defaultTo(1);
            table.integer('log_responses').defaultTo(0);
            table.integer('require_https').defaultTo(0);
            table.string('allowed_origins').nullable();
            table.string('created_at').notNullable();
            table.string('updated_at').notNullable();
        });

        // Seed default ApiSettings
        const now = Date.now().toString();
        await this.insert('apisettings', {
            global_rate_limit_enabled: 1,
            global_rate_limit_requests: 1000,
            global_rate_limit_window: 3600,
            default_session_limit: 100,
            default_max_messages_per_session: 50,
            session_expiration_hours: 24,
            api_key_prefix: 'bb_',
            api_key_length: 32,
            log_requests: 1,
            log_responses: 0,
            require_https: 0,
            allowed_origins: null,
            created_at: now,
            updated_at: now
        });
    }

    async down() {
        await this.dropTable('apisettings');
        await this.dropTable('apisession');
        await this.dropTable('api');
    }
}

module.exports = InitMigration;
