const master = require('mastercontroller');
const messagesEntity = require(`${master.root}/components/chats/app/models/messages`);

/**
 * TPSService - Handles Tokens Per Second calculations and management
 * Responsibilities:
 * - Calculate tokens per second for message generation
 * - Update TPS statistics in database
 * - Provide TPS analytics and insights
 */
class TPSService {
    constructor(chatContext, currentUser) {
        this.chatContext = chatContext;
        this.currentUser = currentUser;
    }

    /**
     * Update TPS (tokens per second) for a message
     * @param {string} messageId - The message ID to update
     * @param {number} tokensPerSecond - The calculated TPS value
     * @returns {Object} - Success/failure result
     */
    async updateMessageTPS(messageId, tokensPerSecond) {
        try {
            if (!messageId) {
                return {
                    success: false,
                    error: 'Message ID is required'
                };
            }

            if (typeof tokensPerSecond !== 'number' || tokensPerSecond < 0) {
                return {
                    success: false,
                    error: 'Invalid tokens per second value'
                };
            }

            const message = await this.chatContext.Messages.where(r => r.id = $$,messageId ).single();
            message.tokens_per_second = tokensPerSecond;
            this.chatContext.saveChanges();

            return {
                    success: true,
                    messageId: messageId,
                    tokensPerSecond: tokensPerSecond,
                    updatedAt: new Date()
            };
           

        } catch (error) {
            console.error('❌ Error updating message TPS:', error);
            return {
                success: false,
                error: 'Database error: ' + error.message
            };
        }
    }

    /**
     * Calculate TPS from generation time and token count
     * @param {number} tokenCount - Number of tokens generated
     * @param {number} generationTimeMs - Time taken in milliseconds
     * @returns {number} - Tokens per second
     */
    calculateTPS(tokenCount, generationTimeMs) {
        if (!tokenCount || !generationTimeMs || generationTimeMs <= 0) {
            return 0;
        }

        const generationTimeSeconds = generationTimeMs / 1000;
        return tokenCount / generationTimeSeconds;
    }

    /**
     * Calculate TPS from start and end timestamps
     * @param {number} tokenCount - Number of tokens generated
     * @param {Date|number} startTime - Start time (Date object or timestamp)
     * @param {Date|number} endTime - End time (Date object or timestamp)
     * @returns {number} - Tokens per second
     */
    calculateTPSFromTimestamps(tokenCount, startTime, endTime) {
        const startMs = startTime instanceof Date ? startTime.getTime() : startTime;
        const endMs = endTime instanceof Date ? endTime.getTime() : endTime;
        
        const durationMs = endMs - startMs;
        return this.calculateTPS(tokenCount, durationMs);
    }

    /**
     * Get TPS statistics for a chat
     * @param {string} chatId - The chat ID to get stats for
     * @param {Object} options - Query options
     * @returns {Object} - TPS statistics
     */
    async getChatTPSStats(chatId, options = {}) {
        try {
            const {
                limit = 50,
                includeThinkingTime = false,
                onlyAIMessages = true
            } = options;

            let whereClause = 'chat_id = ?';
            let params = [chatId];

            if (onlyAIMessages) {
                whereClause += ' AND role = ?';
                params.push('assistant');
            }

            if (!includeThinkingTime) {
                whereClause += ' AND tokens_per_second IS NOT NULL AND tokens_per_second > 0';
            }

            const query = `
                SELECT 
                    id,
                    tokens_per_second,
                    token_count,
                    generation_time,
                    created_at,
                    model_id
                FROM messages 
                WHERE ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            params.push(limit);

            const messages = await this.chatContext.query(query, params);

            if (!messages || messages.length === 0) {
                return {
                    success: true,
                    stats: {
                        messageCount: 0,
                        averageTPS: 0,
                        minTPS: 0,
                        maxTPS: 0,
                        totalTokens: 0,
                        totalGenerationTime: 0
                    },
                    messages: []
                };
            }

            // Calculate statistics
            const validMessages = messages.filter(m => m.tokens_per_second > 0);
            const tpsValues = validMessages.map(m => m.tokens_per_second);
            const totalTokens = validMessages.reduce((sum, m) => sum + (m.token_count || 0), 0);
            const totalGenerationTime = validMessages.reduce((sum, m) => sum + (m.generation_time || 0), 0);

            const stats = {
                messageCount: validMessages.length,
                averageTPS: tpsValues.length > 0 ? tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length : 0,
                minTPS: tpsValues.length > 0 ? Math.min(...tpsValues) : 0,
                maxTPS: tpsValues.length > 0 ? Math.max(...tpsValues) : 0,
                medianTPS: this._calculateMedian(tpsValues),
                totalTokens,
                totalGenerationTime,
                averageGenerationTime: validMessages.length > 0 ? totalGenerationTime / validMessages.length : 0
            };

            return {
                success: true,
                stats,
                messages: validMessages.map(m => ({
                    id: m.id,
                    tokensPerSecond: m.tokens_per_second,
                    tokenCount: m.token_count,
                    generationTime: m.generation_time,
                    createdAt: m.created_at,
                    modelId: m.model_id
                }))
            };

        } catch (error) {
            console.error('❌ Error getting chat TPS stats:', error);
            return {
                success: false,
                error: 'Database error: ' + error.message
            };
        }
    }

    /**
     * Get TPS statistics across all chats for a user
     * @param {string} userId - The user ID to get stats for
     * @param {Object} options - Query options
     * @returns {Object} - Global TPS statistics
     */
    async getUserTPSStats(userId, options = {}) {
        try {
            const {
                limit = 100,
                daysBack = 30,
                modelId = null
            } = options;

            let whereClause = 'user_id = ? AND role = ? AND tokens_per_second IS NOT NULL AND tokens_per_second > 0';
            let params = [userId, 'assistant'];

            // Add date filter
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - daysBack);
            whereClause += ' AND created_at >= ?';
            params.push(dateLimit);

            // Add model filter if specified
            if (modelId) {
                whereClause += ' AND model_id = ?';
                params.push(modelId);
            }

            const query = `
                SELECT 
                    tokens_per_second,
                    token_count,
                    generation_time,
                    model_id,
                    created_at
                FROM messages 
                WHERE ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            params.push(limit);

            const messages = await this.chatContext.query(query, params);

            if (!messages || messages.length === 0) {
                return {
                    success: true,
                    stats: {
                        messageCount: 0,
                        averageTPS: 0,
                        minTPS: 0,
                        maxTPS: 0,
                        totalTokens: 0,
                        modelsUsed: []
                    }
                };
            }

            const tpsValues = messages.map(m => m.tokens_per_second);
            const totalTokens = messages.reduce((sum, m) => sum + (m.token_count || 0), 0);
            
            // Group by model
            const modelStats = {};
            messages.forEach(m => {
                if (!modelStats[m.model_id]) {
                    modelStats[m.model_id] = {
                        messageCount: 0,
                        totalTPS: 0,
                        totalTokens: 0
                    };
                }
                modelStats[m.model_id].messageCount++;
                modelStats[m.model_id].totalTPS += m.tokens_per_second;
                modelStats[m.model_id].totalTokens += m.token_count || 0;
            });

            const modelsUsed = Object.keys(modelStats).map(modelId => ({
                modelId,
                messageCount: modelStats[modelId].messageCount,
                averageTPS: modelStats[modelId].totalTPS / modelStats[modelId].messageCount,
                totalTokens: modelStats[modelId].totalTokens
            }));

            const stats = {
                messageCount: messages.length,
                averageTPS: tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length,
                minTPS: Math.min(...tpsValues),
                maxTPS: Math.max(...tpsValues),
                medianTPS: this._calculateMedian(tpsValues),
                totalTokens,
                modelsUsed
            };

            return {
                success: true,
                stats
            };

        } catch (error) {
            console.error('❌ Error getting user TPS stats:', error);
            return {
                success: false,
                error: 'Database error: ' + error.message
            };
        }
    }

    /**
     * Calculate median value from an array
     * @private
     * @param {Array} values - Array of numbers
     * @returns {number} - Median value
     */
    _calculateMedian(values) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    /**
     * Format TPS value for display
     * @param {number} tps - Tokens per second value
     * @returns {string} - Formatted TPS string
     */
    formatTPS(tps) {
        if (!tps || tps === 0) {
            return '0.0 t/s';
        }
        
        if (tps < 1) {
            return `${tps.toFixed(2)} t/s`;
        } else if (tps < 10) {
            return `${tps.toFixed(1)} t/s`;
        } else {
            return `${Math.round(tps)} t/s`;
        }
    }

    /**
     * Get TPS performance rating
     * @param {number} tps - Tokens per second value
     * @returns {Object} - Performance rating and description
     */
    getTPSRating(tps) {
        if (tps >= 50) {
            return { rating: 'excellent', description: 'Very fast generation' };
        } else if (tps >= 20) {
            return { rating: 'good', description: 'Fast generation' };
        } else if (tps >= 10) {
            return { rating: 'average', description: 'Normal generation speed' };
        } else if (tps >= 5) {
            return { rating: 'slow', description: 'Slow generation' };
        } else {
            return { rating: 'very_slow', description: 'Very slow generation' };
        }
    }
}

module.exports = TPSService;
