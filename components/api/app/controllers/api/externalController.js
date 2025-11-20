const mastercontroller = require('mastercontroller');
const crypto = require('crypto');
const MessageService = require('../../service/messageService');

class externalController extends mastercontroller.controller {
    constructor() {
        super();
    }

    async chat(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const { api_key } = req.params;
            const { message, session_id } = req.body;

            // Validate request
            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            // Generate or use provided session ID
            const sessionId = session_id || `session_${crypto.randomBytes(16).toString('hex')}`;

            // Use MessageService for LLM processing with full hook integration
            const messageService = new MessageService(apiContext);

            const result = await messageService.process(api_key, message, sessionId, {
                stream: false // TODO: Support streaming in future
            });

            return res.json({
                success: true,
                session_id: result.sessionId,
                response: result.response,
                model: result.model,
                tokens: result.tokens,
                usage: result.usage,
                processingTime: result.processingTime
            });
        } catch (error) {
            console.error('[External Controller] Chat error:', error);

            // Handle specific error codes
            const statusCode = {
                'INVALID_API_KEY': 401,
                'INACTIVE_API_KEY': 403,
                'RATE_LIMIT_EXCEEDED': 429,
                'SESSION_LIMIT_EXCEEDED': 429,
                'NO_MODEL_CONFIGURED': 400,
                'MODEL_NOT_FOUND': 404
            }[error.code] || 500;

            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code
            });
        }
    }

    async getSession(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const { api_key, session_id } = req.params;

            // Use MessageService for stats retrieval
            const messageService = new MessageService(apiContext);

            // Validate API key first
            await messageService.validateApiKey(api_key);

            // Get session stats
            const stats = await messageService.getSessionStats(session_id);

            return res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('[External Controller] Get session error:', error);

            const statusCode = {
                'INVALID_API_KEY': 401,
                'INACTIVE_API_KEY': 403
            }[error.code] || (error.message === 'Session not found' ? 404 : 500);

            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code
            });
        }
    }

    async clearSession(req, res) {
        try {
            const apiContext = await req.app.make('apiContext');
            const { api_key, session_id } = req.params;

            // Use MessageService for clearing
            const messageService = new MessageService(apiContext);

            // Validate API key first
            await messageService.validateApiKey(api_key);

            // Clear session
            await messageService.clearSession(session_id);

            return res.json({
                success: true,
                message: 'Session cleared successfully'
            });
        } catch (error) {
            console.error('[External Controller] Clear session error:', error);

            const statusCode = {
                'INVALID_API_KEY': 401,
                'INACTIVE_API_KEY': 403
            }[error.code] || (error.message === 'Session not found' ? 404 : 500);

            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code
            });
        }
    }
}

module.exports = externalController;
