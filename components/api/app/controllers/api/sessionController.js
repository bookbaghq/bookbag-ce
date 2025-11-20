const mastercontroller = require('mastercontroller');

class sessionController extends mastercontroller.controller {
    constructor() {
        super();
    }

    async list(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const ApiSession = apiContext.dbset('ApiSession');

            const { api_id } = req.query;

            let query = ApiSession.select();

            if (api_id) {
                query = ApiSession.where('api_id', api_id);
            }

            const sessions = await query.all();

            return res.json({
                success: true,
                data: sessions
            });
        } catch (error) {
            console.error('[Session Controller] List error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async get(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const ApiSession = apiContext.dbset('ApiSession');

            const session = await ApiSession.where('id', req.params.id).single();

            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            return res.json({
                success: true,
                data: session
            });
        } catch (error) {
            console.error('[Session Controller] Get error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async delete(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const ApiSession = apiContext.dbset('ApiSession');

            const session = await ApiSession.where('id', req.params.id).single();

            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            await session.delete();

            return res.json({
                success: true,
                message: 'Session deleted successfully'
            });
        } catch (error) {
            console.error('[Session Controller] Delete error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async clearByApi(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const ApiSession = apiContext.dbset('ApiSession');
            const { api_id } = req.params;

            const result = await ApiSession.where('api_id', api_id).delete();

            return res.json({
                success: true,
                message: 'All sessions cleared for API'
            });
        } catch (error) {
            console.error('[Session Controller] Clear by API error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = sessionController;
