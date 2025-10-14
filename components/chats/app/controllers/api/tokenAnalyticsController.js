const master = require('mastercontroller');

/**
 * Token Analytics Controller
 *
 * Provides token usage analytics across chats, models, and users:
 * - Total token usage
 * - Chats with most tokens
 * - Models that use the most tokens
 * - Top users by token consumption
 */
class tokenAnalyticsController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;
        this._userContext = req.userContext;
        this._modelContext = req.modelContext;
    }

    /**
     * Get comprehensive token analytics
     * GET /bb-chat/api/token-analytics
     */
    async getAnalytics(obj) {
        try {
            // Get all chats (non-deleted, non-archived)
            const allChats = this._chatContext.Chat
                .where(c => c.is_deleted == $$ && c.is_archived == $$, 0, 0)
                .toList();

            // Calculate total tokens across all chats
            const totalTokens = allChats.reduce((sum, chat) => {
                return sum + (parseInt(chat.total_token_count) || 0);
            }, 0);

            // Get top 10 chats by token usage
            const topChats = allChats
                .filter(chat => chat.total_token_count > 0)
                .sort((a, b) => (b.total_token_count || 0) - (a.total_token_count || 0))
                .slice(0, 10)
                .map(chat => ({
                    id: chat.id,
                    title: chat.title || 'Untitled Chat',
                    session_id: chat.session_id,
                    total_tokens: parseInt(chat.total_token_count) || 0,
                    created_at: parseInt(chat.created_at),
                    updated_at: parseInt(chat.updated_at)
                }));

            // Calculate token usage by model
            const modelTokenMap = new Map();
            const allMessages = this._chatContext.Messages.toList();

            for (const message of allMessages) {
                const modelId = message.model_id;
                const tokenCount = parseInt(message.token_count) || 0;

                if (modelId && tokenCount > 0) {
                    const current = modelTokenMap.get(modelId) || { count: 0, messageCount: 0 };
                    modelTokenMap.set(modelId, {
                        count: current.count + tokenCount,
                        messageCount: current.messageCount + 1
                    });
                }
            }

            // Get model details and format results
            const topModels = [];
            for (const [modelId, data] of modelTokenMap.entries()) {
                try {
                    const model = this._modelContext.Model
                        .where(m => m.id == $$, modelId)
                        .single();

                    if (model) {
                        topModels.push({
                            model_id: modelId,
                            model_name: model.name,
                            provider: model.provider || 'unknown',
                            total_tokens: data.count,
                            message_count: data.messageCount,
                            avg_tokens_per_message: Math.round(data.count / data.messageCount)
                        });
                    }
                } catch (err) {
                    // Model might not exist anymore, skip it
                    console.warn(`Model ${modelId} not found:`, err.message);
                }
            }

            // Sort by total tokens and get top 10
            topModels.sort((a, b) => b.total_tokens - a.total_tokens);
            const top10Models = topModels.slice(0, 10);

            // Calculate token usage by user
            const userTokenMap = new Map();

            // Get all UserChat relationships
            const allUserChats = this._chatContext.UserChat.toList();

            for (const userChat of allUserChats) {
                try {
                    const chat = this._chatContext.Chat
                        .where(c => c.id == $$ && c.is_deleted == $$ && c.is_archived == $$, userChat.chat_id, 0, 0)
                        .single();

                    if (chat) {
                        const userId = userChat.user_id;
                        const tokenCount = parseInt(chat.total_token_count) || 0;

                        const current = userTokenMap.get(userId) || { totalTokens: 0, chatCount: 0 };
                        userTokenMap.set(userId, {
                            totalTokens: current.totalTokens + tokenCount,
                            chatCount: current.chatCount + 1
                        });
                    }
                } catch (err) {
                    // Chat might not exist or is deleted, skip it
                }
            }

            // Get user details and format results
            const topUsers = [];
            for (const [userId, data] of userTokenMap.entries()) {
                try {
                    const user = this._userContext.User
                        .where(u => u.id == $$, userId)
                        .single();

                    if (user) {
                        topUsers.push({
                            user_id: userId,
                            username: user.user_name,
                            email: user.email,
                            first_name: user.first_name || '',
                            last_name: user.last_name || '',
                            total_tokens: data.totalTokens,
                            chat_count: data.chatCount,
                            avg_tokens_per_chat: data.chatCount > 0 ? Math.round(data.totalTokens / data.chatCount) : 0
                        });
                    }
                } catch (err) {
                    // User might not exist anymore, skip it
                    console.warn(`User ${userId} not found:`, err.message);
                }
            }

            // Sort by total tokens and get top 10
            topUsers.sort((a, b) => b.total_tokens - a.total_tokens);
            const top10Users = topUsers.slice(0, 10);

            return this.returnJson({
                success: true,
                analytics: {
                    totalTokens: totalTokens,
                    totalChats: allChats.length,
                    totalMessages: allMessages.length,
                    topChats: topChats,
                    topModels: top10Models,
                    topUsers: top10Users,
                    generatedAt: Date.now()
                }
            });

        } catch (error) {
            console.error('Error getting token analytics:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get token analytics for a specific user
     * GET /bb-chat/api/token-analytics/user/:userId
     */
    async getUserAnalytics(obj) {
        try {
            const userId = obj.params.userid;

            if (!userId) {
                return this.returnJson({
                    success: false,
                    error: 'User ID is required'
                });
            }

            // Get user info
            const user = this._userContext.User
                .where(u => u.id == $$, userId)
                .single();

            if (!user) {
                return this.returnJson({
                    success: false,
                    error: 'User not found'
                });
            }

            // Get all chats for this user
            const userChats = this._chatContext.UserChat
                .where(uc => uc.user_id == $$, userId)
                .toList();

            let totalTokens = 0;
            const chatDetails = [];

            for (const userChat of userChats) {
                try {
                    const chat = this._chatContext.Chat
                        .where(c => c.id == $$ && c.is_deleted == $$ && c.is_archived == $$, userChat.chat_id, 0, 0)
                        .single();

                    if (chat) {
                        const tokens = parseInt(chat.total_token_count) || 0;
                        totalTokens += tokens;

                        chatDetails.push({
                            id: chat.id,
                            title: chat.title || 'Untitled Chat',
                            total_tokens: tokens,
                            created_at: parseInt(chat.created_at),
                            updated_at: parseInt(chat.updated_at)
                        });
                    }
                } catch (err) {
                    // Chat might not exist, skip it
                }
            }

            // Sort chats by token usage
            chatDetails.sort((a, b) => b.total_tokens - a.total_tokens);

            return this.returnJson({
                success: true,
                user: {
                    id: user.id,
                    username: user.user_name,
                    email: user.email,
                    first_name: user.first_name || '',
                    last_name: user.last_name || ''
                },
                analytics: {
                    totalTokens: totalTokens,
                    chatCount: chatDetails.length,
                    avgTokensPerChat: chatDetails.length > 0 ? Math.round(totalTokens / chatDetails.length) : 0,
                    chats: chatDetails
                }
            });

        } catch (error) {
            console.error('Error getting user token analytics:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    returnJson(obj) {
        return obj;
    }
}

module.exports = tokenAnalyticsController;
