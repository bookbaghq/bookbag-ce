const mastercontroller = require('mastercontroller');
const crypto = require('crypto');

class apiController extends mastercontroller.controller {
    constructor() {
        super();
    }

    async list(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const Api = apiContext.dbset('Api');

            const apis = await Api.select();

            return res.json({
                success: true,
                data: apis
            });
        } catch (error) {
            console.error('[API Controller] List error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async get(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const Api = apiContext.dbset('Api');

            const api = await Api.where('id', req.params.id).single();

            if (!api) {
                return res.status(404).json({
                    success: false,
                    error: 'API not found'
                });
            }

            return res.json({
                success: true,
                data: api
            });
        } catch (error) {
            console.error('[API Controller] Get error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async create(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const Api = apiContext.dbset('Api');
            const ApiSettings = apiContext.dbset('ApiSettings');

            const { name, description, model_id, model_name, rate_limit_requests, rate_limit_window, session_limit, max_messages_per_session } = req.body;

            // Get settings for defaults
            const settings = await ApiSettings.single();

            // Generate API key
            const api_key = settings.api_key_prefix + crypto.randomBytes(settings.api_key_length / 2).toString('hex');

            const now = Date.now().toString();
            const newApi = await Api.insert({
                name,
                description: description || null,
                model_id: model_id || null,
                model_name: model_name || null,
                api_key,
                user_id: req.user ? req.user.id : null,
                rate_limit_requests: rate_limit_requests || 100,
                rate_limit_window: rate_limit_window || 60,
                session_limit: session_limit || null,
                max_messages_per_session: max_messages_per_session || null,
                is_active: 1,
                total_requests: 0,
                last_used_at: null,
                created_at: now,
                updated_at: now
            });

            // TODO: Trigger hook: API_KEY_CREATED
            // await hookService.doAction('API_KEY_CREATED', { api: newApi });

            return res.json({
                success: true,
                data: newApi
            });
        } catch (error) {
            console.error('[API Controller] Create error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async update(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const Api = apiContext.dbset('Api');

            const api = await Api.where('id', req.params.id).single();

            if (!api) {
                return res.status(404).json({
                    success: false,
                    error: 'API not found'
                });
            }

            const { name, description, model_id, model_name, rate_limit_requests, rate_limit_window, session_limit, max_messages_per_session } = req.body;

            // Update fields
            if (name !== undefined) api.name = name;
            if (description !== undefined) api.description = description;
            if (model_id !== undefined) api.model_id = model_id;
            if (model_name !== undefined) api.model_name = model_name;
            if (rate_limit_requests !== undefined) api.rate_limit_requests = rate_limit_requests;
            if (rate_limit_window !== undefined) api.rate_limit_window = rate_limit_window;
            if (session_limit !== undefined) api.session_limit = session_limit;
            if (max_messages_per_session !== undefined) api.max_messages_per_session = max_messages_per_session;

            api.updated_at = Date.now().toString();

            await api.save();

            return res.json({
                success: true,
                data: api
            });
        } catch (error) {
            console.error('[API Controller] Update error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async delete(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const Api = apiContext.dbset('Api');
            const ApiSession = apiContext.dbset('ApiSession');

            const api = await Api.where('id', req.params.id).single();

            if (!api) {
                return res.status(404).json({
                    success: false,
                    error: 'API not found'
                });
            }

            // Delete all associated sessions
            await ApiSession.where('api_id', req.params.id).delete();

            // Delete the API
            await api.delete();

            return res.json({
                success: true,
                message: 'API and associated sessions deleted successfully'
            });
        } catch (error) {
            console.error('[API Controller] Delete error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async toggle(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const Api = apiContext.dbset('Api');

            const api = await Api.where('id', req.params.id).single();

            if (!api) {
                return res.status(404).json({
                    success: false,
                    error: 'API not found'
                });
            }

            // Toggle is_active
            api.is_active = api.is_active ? 0 : 1;
            api.updated_at = Date.now().toString();

            await api.save();

            // TODO: Trigger hook
            // const hookType = api.is_active ? 'API_KEY_ACTIVATED' : 'API_KEY_DEACTIVATED';
            // await hookService.doAction(hookType, { api });

            return res.json({
                success: true,
                data: api
            });
        } catch (error) {
            console.error('[API Controller] Toggle error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async regenerate(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const Api = apiContext.dbset('Api');
            const ApiSettings = apiContext.dbset('ApiSettings');

            const api = await Api.where('id', req.params.id).single();

            if (!api) {
                return res.status(404).json({
                    success: false,
                    error: 'API not found'
                });
            }

            // Get settings for key generation
            const settings = await ApiSettings.single();

            // Generate new API key
            api.api_key = settings.api_key_prefix + crypto.randomBytes(settings.api_key_length / 2).toString('hex');
            api.updated_at = Date.now().toString();

            await api.save();

            return res.json({
                success: true,
                data: api
            });
        } catch (error) {
            console.error('[API Controller] Regenerate error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = apiController;
