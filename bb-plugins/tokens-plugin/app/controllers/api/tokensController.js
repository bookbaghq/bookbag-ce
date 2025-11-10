/**
 * Tokens Analytics Controller
 * Provides comprehensive token usage analytics and metrics
 */

class tokensController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._tokensContext = req.tokensContext;
        this._request = req.request;
        this._session = req.session;
    }

    returnJson(obj) {
        return obj;
    }

    /**
     * Get comprehensive token analytics
     * Supports filtering by user, date range, model, etc.
     */
    async getAnalytics(req) {
        try {
            const { userId, startDate, endDate, modelId, period = 'daily' } = req.params?.query || {};

            // Get all usage records first
            let totalUsage = await this._tokensContext.TokenUsage.where().toList();

            // Apply filters in JavaScript if provided
            if (userId) {
                totalUsage = totalUsage.filter(u => u.user_id === parseInt(userId));
            }
            if (modelId) {
                totalUsage = totalUsage.filter(u => u.model_id === parseInt(modelId));
            }
            if (startDate) {
                totalUsage = totalUsage.filter(u => u.created_at >= parseInt(startDate));
            }
            if (endDate) {
                totalUsage = totalUsage.filter(u => u.created_at <= parseInt(endDate));
            }

            // Calculate aggregates
            const analytics = {
                totalRequests: totalUsage.length,
                totalTokens: totalUsage.reduce((sum, u) => sum + (u.total_tokens || 0), 0),
                totalPromptTokens: totalUsage.reduce((sum, u) => sum + (u.prompt_tokens || 0), 0),
                totalCompletionTokens: totalUsage.reduce((sum, u) => sum + (u.completion_tokens || 0), 0),
                totalCost: totalUsage.reduce((sum, u) => sum + (u.estimated_cost || 0), 0),
                avgTokensPerRequest: 0,
                avgDuration: 0,
                avgTokensPerSecond: 0,
                byModel: {},
                byUser: {},
                timeline: []
            };

            // Calculate averages
            if (totalUsage.length > 0) {
                analytics.avgTokensPerRequest = Math.round(analytics.totalTokens / totalUsage.length);
                const totalDuration = totalUsage.reduce((sum, u) => sum + (u.duration_ms || 0), 0);
                analytics.avgDuration = Math.round(totalDuration / totalUsage.length);
                const validTps = totalUsage.filter(u => u.tokens_per_second).map(u => u.tokens_per_second);
                if (validTps.length > 0) {
                    analytics.avgTokensPerSecond = (validTps.reduce((sum, t) => sum + t, 0) / validTps.length).toFixed(2);
                }
            }

            // Group by model
            totalUsage.forEach(usage => {
                const model = usage.model_name || 'unknown';
                if (!analytics.byModel[model]) {
                    analytics.byModel[model] = {
                        requests: 0,
                        tokens: 0,
                        cost: 0
                    };
                }
                analytics.byModel[model].requests++;
                analytics.byModel[model].tokens += usage.total_tokens || 0;
                analytics.byModel[model].cost += usage.estimated_cost || 0;
            });

            // Group by user
            totalUsage.forEach(usage => {
                const userId = usage.user_id || 0;
                if (!analytics.byUser[userId]) {
                    analytics.byUser[userId] = {
                        requests: 0,
                        tokens: 0,
                        cost: 0
                    };
                }
                analytics.byUser[userId].requests++;
                analytics.byUser[userId].tokens += usage.total_tokens || 0;
                analytics.byUser[userId].cost += usage.estimated_cost || 0;
            });

            // Create timeline based on period
            analytics.timeline = this.createTimeline(totalUsage, period);

            return this.returnJson(analytics);
        } catch (error) {
            console.error('Error in getAnalytics:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get usage stats for current user
     */
    async getUserStats(req) {
        try {
            const userId = this._session?.user?.id;

            if (!userId) {
                return this.returnJson({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            // Get settings for limits
            const settings = await this._tokensContext.TokenSettings.where().single();

            // Get user's usage for current period
            const periodStart = settings ? this.getPeriodStartTime(settings.per_user_limit_period) : Date.now() - (30 * 24 * 60 * 60 * 1000);

            const userUsage = await this._tokensContext.TokenUsage
                .where({
                    user_id: userId,
                    created_at: { $gte: periodStart }
                })
                .toList();

            const totalTokens = userUsage.reduce((sum, u) => sum + (u.total_tokens || 0), 0);
            const totalCost = userUsage.reduce((sum, u) => sum + (u.estimated_cost || 0), 0);

            const stats = {
                userId,
                period: settings?.per_user_limit_period || 'monthly',
                usage: {
                    requests: userUsage.length,
                    tokens: totalTokens,
                    cost: totalCost
                },
                limit: {
                    enabled: settings?.per_user_limit_enabled || 0,
                    tokens: settings?.per_user_token_limit || null,
                    percentage: settings?.per_user_token_limit ? (totalTokens / settings.per_user_token_limit * 100).toFixed(1) : null
                }
            };

            return this.returnJson(stats);
        } catch (error) {
            console.error('Error in getUserStats:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get recent token usage activity
     */
    async getRecentActivity(req) {
        try {
            const { limit = 50, userId, chatId } = req.params?.query || {};

            const filters = {};
            if (userId) filters.user_id = parseInt(userId);
            if (chatId) filters.chat_id = parseInt(chatId);

            const recentUsage = await this._tokensContext.TokenUsage
                .where(filters)
                .orderBy('created_at', 'DESC')
                .limit(parseInt(limit))
                .toList();

            return this.returnJson(recentUsage);
        } catch (error) {
            console.error('Error in getRecentActivity:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Helper: Create timeline data
     */
    createTimeline(usage, period) {
        const timeline = {};

        usage.forEach(u => {
            const date = new Date(u.created_at);
            let key;

            switch (period) {
                case 'hourly':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
                    break;
                case 'daily':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    break;
                case 'weekly':
                    const weekNum = this.getWeekNumber(date);
                    key = `${date.getFullYear()}-W${weekNum}`;
                    break;
                case 'monthly':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                default:
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }

            if (!timeline[key]) {
                timeline[key] = {
                    timestamp: key,
                    requests: 0,
                    tokens: 0,
                    cost: 0
                };
            }

            timeline[key].requests++;
            timeline[key].tokens += u.total_tokens || 0;
            timeline[key].cost += u.estimated_cost || 0;
        });

        return Object.values(timeline).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    /**
     * Helper: Get week number
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Helper: Get period start time
     */
    getPeriodStartTime(period) {
        const now = new Date();
        let periodStart;

        switch (period) {
            case 'daily':
                periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                const dayOfWeek = now.getDay();
                periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
                break;
            case 'monthly':
                periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'yearly':
                periodStart = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return periodStart.getTime();
    }
}

module.exports = tokensController;
