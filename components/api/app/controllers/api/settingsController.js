const mastercontroller = require('mastercontroller');

class settingsController extends mastercontroller.controller {
    constructor() {
        super();
    }

    async get(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const ApiSettings = apiContext.dbset('ApiSettings');

            let settings = await ApiSettings.single();

            // If no settings exist, create default
            if (!settings) {
                const now = Date.now().toString();
                settings = await ApiSettings.insert({
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

            return res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('[Settings Controller] Get error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async update(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const ApiSettings = apiContext.dbset('ApiSettings');

            let settings = await ApiSettings.single();

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    error: 'Settings not found'
                });
            }

            // Update allowed fields
            const allowedFields = [
                'global_rate_limit_enabled',
                'global_rate_limit_requests',
                'global_rate_limit_window',
                'default_session_limit',
                'default_max_messages_per_session',
                'session_expiration_hours',
                'api_key_prefix',
                'api_key_length',
                'log_requests',
                'log_responses',
                'require_https',
                'allowed_origins'
            ];

            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    settings[field] = req.body[field];
                }
            });

            settings.updated_at = Date.now().toString();

            await settings.save();

            return res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('[Settings Controller] Update error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = settingsController;
