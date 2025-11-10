/**
 * Token Settings Controller
 * Manages token limits and configuration settings
 */

const TokensContext = require('../../models/tokensContext');

class settingsController {
    /**
     * Get current token settings
     */
    async getSettings() {
        try {
            const tokensContext = new TokensContext();
            const settings = await tokensContext.TokenSettings.single();

            if (!settings) {
                // Return default settings if none exist
                return this.send({
                    global_token_limit: null,
                    global_limit_period: 'monthly',
                    global_limit_enabled: 0,
                    per_user_token_limit: null,
                    per_user_limit_period: 'monthly',
                    per_user_limit_enabled: 0,
                    per_chat_token_limit: null,
                    per_chat_limit_enabled: 0,
                    rate_limit_enabled: 0,
                    rate_limit_requests: 100,
                    rate_limit_window: 60,
                    notify_on_limit_reached: 1,
                    notify_threshold: 90,
                    track_costs: 0,
                    currency: 'USD'
                });
            }

            this.send(settings);
        } catch (error) {
            console.error('Error in getSettings:', error);
            this.sendError(error.message, 500);
        }
    }

    /**
     * Update token settings
     */
    async updateSettings() {
        try {
            const tokensContext = new TokensContext();

            // Check if user has admin permissions
            if (!this.session?.user?.isAdmin) {
                return this.sendError('Unauthorized: Admin access required', 403);
            }

            const updates = this.request.body;

            // Get existing settings or create new
            let settings = await tokensContext.TokenSettings.where().single();

            if (!settings) {
                settings = new (require('../../models/tokenSettings'))();
            }

            // Update fields
            if (updates.global_token_limit !== undefined) settings.global_token_limit = updates.global_token_limit;
            if (updates.global_limit_period !== undefined) settings.global_limit_period = updates.global_limit_period;
            if (updates.global_limit_enabled !== undefined) settings.global_limit_enabled = updates.global_limit_enabled;

            if (updates.per_user_token_limit !== undefined) settings.per_user_token_limit = updates.per_user_token_limit;
            if (updates.per_user_limit_period !== undefined) settings.per_user_limit_period = updates.per_user_limit_period;
            if (updates.per_user_limit_enabled !== undefined) settings.per_user_limit_enabled = updates.per_user_limit_enabled;

            if (updates.per_chat_token_limit !== undefined) settings.per_chat_token_limit = updates.per_chat_token_limit;
            if (updates.per_chat_limit_enabled !== undefined) settings.per_chat_limit_enabled = updates.per_chat_limit_enabled;

            if (updates.rate_limit_enabled !== undefined) settings.rate_limit_enabled = updates.rate_limit_enabled;
            if (updates.rate_limit_requests !== undefined) settings.rate_limit_requests = updates.rate_limit_requests;
            if (updates.rate_limit_window !== undefined) settings.rate_limit_window = updates.rate_limit_window;

            if (updates.notify_on_limit_reached !== undefined) settings.notify_on_limit_reached = updates.notify_on_limit_reached;
            if (updates.notify_threshold !== undefined) settings.notify_threshold = updates.notify_threshold;

            if (updates.track_costs !== undefined) settings.track_costs = updates.track_costs;
            if (updates.currency !== undefined) settings.currency = updates.currency;

            settings.updated_at = Date.now();

            // Save settings
            if (settings.id) {
                await tokensContext.TokenSettings.update(settings);
            } else {
                settings.created_at = Date.now();
                await tokensContext.TokenSettings.add(settings);
            }

            this.send({
                success: true,
                message: 'Settings updated successfully',
                settings
            });
        } catch (error) {
            console.error('Error in updateSettings:', error);
            this.sendError(error.message, 500);
        }
    }

    /**
     * Check current usage against limits
     */
    async checkLimits() {
        try {
            const tokensContext = new TokensContext();
            const userId = this.session?.user?.id;

            const settings = await tokensContext.TokenSettings.where().single();

            if (!settings) {
                return this.send({ limits: [] });
            }

            const limits = [];

            // Check global limit
            if (settings.global_limit_enabled && settings.global_token_limit) {
                const periodStart = this.getPeriodStartTime(settings.global_limit_period);
                const totalUsage = await tokensContext.TokenUsage
                    .where({ created_at: { $gte: periodStart } })
                    .sum('total_tokens');

                limits.push({
                    type: 'global',
                    limit: settings.global_token_limit,
                    usage: totalUsage || 0,
                    percentage: ((totalUsage || 0) / settings.global_token_limit * 100).toFixed(1),
                    period: settings.global_limit_period,
                    exceeded: totalUsage >= settings.global_token_limit
                });
            }

            // Check per-user limit
            if (userId && settings.per_user_limit_enabled && settings.per_user_token_limit) {
                const periodStart = this.getPeriodStartTime(settings.per_user_limit_period);
                const userUsage = await tokensContext.TokenUsage
                    .where({
                        user_id: userId,
                        created_at: { $gte: periodStart }
                    })
                    .sum('total_tokens');

                limits.push({
                    type: 'per_user',
                    limit: settings.per_user_token_limit,
                    usage: userUsage || 0,
                    percentage: ((userUsage || 0) / settings.per_user_token_limit * 100).toFixed(1),
                    period: settings.per_user_limit_period,
                    exceeded: userUsage >= settings.per_user_token_limit
                });
            }

            this.send({ limits });
        } catch (error) {
            console.error('Error in checkLimits:', error);
            this.sendError(error.message, 500);
        }
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

module.exports = settingsController;
