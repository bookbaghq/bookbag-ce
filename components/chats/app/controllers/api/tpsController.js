const master = require('mastercontroller');
const TPSService = require(`${master.root}/components/chats/app/service/tpsService`);

/**
 * TPSController - Handles TPS (Tokens Per Second) related endpoints
 * Uses TPSService for all TPS calculations and management
 */
class tpsController {

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;

        // Initialize TPSService
        this.tpsService = new TPSService(this._chatContext, this._currentUser);
    }

    /**
     * Update TPS (tokens per second) for a message
     * POST /api/tps/update
     */
    async updateTps(obj) {
        try {
            // Handle CORS preflight
            if (obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const { messageId, tokensPerSecond } = obj.params.formData || obj.params;
            
            const result = await this.tpsService.updateMessageTPS(messageId, tokensPerSecond);
            
            return this.returnJson(result);
        } catch (error) {
            console.error('❌ Error in updateTps endpoint:', error);
            return this.returnJson({
                success: false,
                error: 'Internal server error: ' + error.message
            });
        }
    }

    /**
     * Get TPS statistics for a chat
     * GET /api/tps/chat/:chatId
     */
    async getChatTPSStats(obj) {
        try {
            // Handle CORS preflight
            if (obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const { chatId } = obj.params;
            const options = {
                limit: parseInt(obj.params.limit) || 50,
                includeThinkingTime: obj.params.includeThinkingTime === 'true',
                onlyAIMessages: obj.params.onlyAIMessages !== 'false'
            };
            
            const result = await this.tpsService.getChatTPSStats(chatId, options);
            
            return this.returnJson(result);
        } catch (error) {
            console.error('❌ Error in getChatTPSStats endpoint:', error);
            return this.returnJson({
                success: false,
                error: 'Internal server error: ' + error.message
            });
        }
    }

    /**
     * Get TPS statistics for a user across all chats
     * GET /api/tps/user/:userId
     */
    async getUserTPSStats(obj) {
        try {
            // Handle CORS preflight
            if (obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const { userId } = obj.params;
            const options = {
                limit: parseInt(obj.params.limit) || 100,
                daysBack: parseInt(obj.params.daysBack) || 30,
                modelId: obj.params.modelId || null
            };
            
            const result = await this.tpsService.getUserTPSStats(userId, options);
            
            return this.returnJson(result);
        } catch (error) {
            console.error('❌ Error in getUserTPSStats endpoint:', error);
            return this.returnJson({
                success: false,
                error: 'Internal server error: ' + error.message
            });
        }
    }

    /**
     * Calculate TPS from provided parameters
     * POST /api/tps/calculate
     */
    async calculateTPS(obj) {
        try {
            // Handle CORS preflight
            if (obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const formData = obj.params.formData || obj.params;
            const { tokenCount, generationTimeMs, startTime, endTime } = formData;

            let tps = 0;

            if (startTime && endTime) {
                // Calculate from timestamps
                tps = this.tpsService.calculateTPSFromTimestamps(tokenCount, startTime, endTime);
            } else if (generationTimeMs) {
                // Calculate from duration
                tps = this.tpsService.calculateTPS(tokenCount, generationTimeMs);
            } else {
                return this.returnJson({
                    success: false,
                    error: 'Either generationTimeMs or both startTime and endTime are required'
                });
            }

            const rating = this.tpsService.getTPSRating(tps);
            const formattedTPS = this.tpsService.formatTPS(tps);

            return this.returnJson({
                success: true,
                tps: tps,
                formattedTPS: formattedTPS,
                rating: rating,
                tokenCount: tokenCount,
                generationTimeMs: endTime && startTime ? (new Date(endTime) - new Date(startTime)) : generationTimeMs
            });
        } catch (error) {
            console.error('❌ Error in calculateTPS endpoint:', error);
            return this.returnJson({
                success: false,
                error: 'Internal server error: ' + error.message
            });
        }
    }

    returnJson(obj) {
        return obj;
    }
}

module.exports = tpsController;
