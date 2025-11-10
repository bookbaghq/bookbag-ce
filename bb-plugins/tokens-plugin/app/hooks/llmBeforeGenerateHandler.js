/**
 * Tokens Plugin: LLM_BEFORE_GENERATE Hook Handler
 *
 * This handler intercepts the LLM pipeline before generating a response to:
 * 1. Check if token limits have been exceeded (global, per-user, per-chat)
 * 2. Store request start time for performance metrics
 * 3. Prevent requests if limits are exceeded by throwing an error
 *
 * @param {Object} context - Hook context containing messageHistory and metadata
 * @returns {Object} - Modified context with timing data or throws error if limit exceeded
 */

const TokensContext = require('../models/tokensContext');

async function handleLLMBeforeGenerate(context) {
    const requestStartTime = Date.now();

    try {
        console.log('📊 Tokens Plugin: LLM_BEFORE_GENERATE hook triggered');

        // Extract parameters from hook context
        const {
            messageHistory,
            chatId,
            workspaceId,
            modelConfig,
            modelSettings,
            userMessageId,
            currentUser
        } = context;

        // Initialize tokens context
        const tokensContext = new TokensContext();

        // Fetch token settings
        const settings = await tokensContext.TokenSettings.where().single();

        if (!settings) {
            console.log('⚠️  Tokens: No settings found, allowing request');
            return {
                ...context,
                _tokenRequestStartTime: requestStartTime
            };
        }

        // Check global token limit
        if (settings.global_limit_enabled) {
            console.log('🔍 Tokens: Checking global token limit');

            const periodStart = getPeriodStartTime(settings.global_limit_period);

            const totalUsage = await tokensContext.TokenUsage
                .where({ created_at: { $gte: periodStart } })
                .sum('total_tokens');

            if (totalUsage >= settings.global_token_limit) {
                console.error(`❌ Tokens: Global token limit exceeded (${totalUsage}/${settings.global_token_limit})`);

                // Throw error to stop LLM request
                const error = new Error('Global token limit exceeded. Please contact your administrator.');
                error.code = 'TOKEN_LIMIT_EXCEEDED';
                error.type = 'global';
                error.currentUsage = totalUsage;
                error.limit = settings.global_token_limit;
                throw error;
            }

            console.log(`✅ Tokens: Global limit check passed (${totalUsage}/${settings.global_token_limit})`);
        }

        // Check per-user token limit
        if (settings.per_user_limit_enabled && currentUser) {
            console.log(`🔍 Tokens: Checking per-user token limit for user ${currentUser.id}`);

            const periodStart = getPeriodStartTime(settings.per_user_limit_period);

            const userUsage = await tokensContext.TokenUsage
                .where({
                    user_id: currentUser.id,
                    created_at: { $gte: periodStart }
                })
                .sum('total_tokens');

            if (userUsage >= settings.per_user_token_limit) {
                console.error(`❌ Tokens: Per-user token limit exceeded for user ${currentUser.id} (${userUsage}/${settings.per_user_token_limit})`);

                const error = new Error('Your token limit has been exceeded. Please try again later or contact support.');
                error.code = 'TOKEN_LIMIT_EXCEEDED';
                error.type = 'per_user';
                error.currentUsage = userUsage;
                error.limit = settings.per_user_token_limit;
                throw error;
            }

            console.log(`✅ Tokens: Per-user limit check passed (${userUsage}/${settings.per_user_token_limit})`);
        }

        // Check per-chat token limit
        if (settings.per_chat_limit_enabled && chatId) {
            console.log(`🔍 Tokens: Checking per-chat token limit for chat ${chatId}`);

            const chatUsage = await tokensContext.TokenUsage
                .where({ chat_id: chatId })
                .sum('total_tokens');

            if (chatUsage >= settings.per_chat_token_limit) {
                console.error(`❌ Tokens: Per-chat token limit exceeded for chat ${chatId} (${chatUsage}/${settings.per_chat_token_limit})`);

                const error = new Error('This chat has exceeded its token limit. Please start a new chat.');
                error.code = 'TOKEN_LIMIT_EXCEEDED';
                error.type = 'per_chat';
                error.currentUsage = chatUsage;
                error.limit = settings.per_chat_token_limit;
                throw error;
            }

            console.log(`✅ Tokens: Per-chat limit check passed (${chatUsage}/${settings.per_chat_token_limit})`);
        }

        console.log('✅ Tokens: All limit checks passed, proceeding with LLM request');

        // Return context with request start time attached
        return {
            ...context,
            _tokenRequestStartTime: requestStartTime
        };

    } catch (error) {
        // If this is a token limit error, re-throw it to be handled by the system
        if (error.code === 'TOKEN_LIMIT_EXCEEDED') {
            throw error;
        }

        // For other errors, log and allow the request to proceed
        console.error('❌ Tokens Plugin: Error in LLM_BEFORE_GENERATE handler:', error.message);
        console.error(error.stack);

        // Return context with start time even on error
        return {
            ...context,
            _tokenRequestStartTime: requestStartTime
        };
    }
}

/**
 * Get the start timestamp for a given period
 * @param {string} period - 'daily', 'weekly', 'monthly', 'yearly'
 * @returns {number} - Unix timestamp in milliseconds
 */
function getPeriodStartTime(period) {
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
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Default to monthly
    }

    return periodStart.getTime();
}

module.exports = handleLLMBeforeGenerate;
