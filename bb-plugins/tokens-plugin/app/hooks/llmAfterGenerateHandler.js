/**
 * Tokens Plugin: LLM_AFTER_GENERATE Hook Handler
 *
 * This handler runs after the LLM has generated a response to:
 * 1. Capture token usage data (prompt, completion, total tokens)
 * 2. Calculate timing metrics (duration, tokens per second)
 * 3. Save detailed usage data to TokenUsage table for analytics
 *
 * @param {Object} context - Hook context containing response and metadata
 * @returns {Object} - Unmodified context (passes through)
 */

const TokensContext = require('../models/tokensContext');
const TokenUsage = require('../models/tokenUsage');

async function handleLLMAfterGenerate(context) {
    try {
        console.log('📊 Tokens Plugin: LLM_AFTER_GENERATE hook triggered');

        // Extract parameters from hook context
        const {
            response,
            prompt,
            model,
            metadata,
            chatId,
            workspaceId,
            userMessageId,
            messageId,
            currentUser,
            modelConfig,
            _tokenRequestStartTime
        } = context;

        // Validate required data
        if (!response || !response.usage) {
            console.log('⚠️  Tokens: No usage data in response, skipping tracking');
            return context;
        }

        // Calculate timing metrics
        const requestEndTime = Date.now();
        const durationMs = _tokenRequestStartTime ? requestEndTime - _tokenRequestStartTime : null;

        const { prompt_tokens, completion_tokens, total_tokens } = response.usage;

        // Calculate tokens per second
        const tokensPerSecond = durationMs ? (total_tokens / (durationMs / 1000)).toFixed(2) : null;

        console.log(`📊 Tokens: Usage - Prompt: ${prompt_tokens}, Completion: ${completion_tokens}, Total: ${total_tokens}`);
        if (durationMs) {
            console.log(`⏱️  Tokens: Duration: ${durationMs}ms, Speed: ${tokensPerSecond} tokens/sec`);
        }

        // Create token usage record
        const tokensContext = new TokensContext();
        const tokenUsageRecord = new TokenUsage();

        // Set core identifiers
        tokenUsageRecord.chat_id = chatId || null;
        tokenUsageRecord.message_id = messageId || null;
        tokenUsageRecord.user_id = currentUser ? currentUser.id : null;
        tokenUsageRecord.workspace_id = workspaceId || null;

        // Set model information
        tokenUsageRecord.model_id = model?.id || null;
        tokenUsageRecord.model_name = model?.name || modelConfig?.model || 'unknown';
        tokenUsageRecord.provider = model?.provider || modelConfig?.provider || 'unknown';

        // Set token counts
        tokenUsageRecord.prompt_tokens = prompt_tokens || 0;
        tokenUsageRecord.completion_tokens = completion_tokens || 0;
        tokenUsageRecord.total_tokens = total_tokens || 0;

        // Set timing metrics
        tokenUsageRecord.request_start_time = _tokenRequestStartTime || null;
        tokenUsageRecord.request_end_time = requestEndTime;
        tokenUsageRecord.duration_ms = durationMs;
        tokenUsageRecord.tokens_per_second = tokensPerSecond ? parseFloat(tokensPerSecond) : null;

        // Set metadata (optional additional context)
        if (metadata) {
            tokenUsageRecord.request_metadata = JSON.stringify({
                ...metadata,
                has_workspace: !!workspaceId,
                user_message_id: userMessageId
            });
        }

        // Calculate estimated cost (if cost tracking is enabled)
        const settings = await tokensContext.TokenSettings.where().single();
        if (settings && settings.track_costs) {
            tokenUsageRecord.estimated_cost = calculateEstimatedCost(
                tokenUsageRecord.model_name,
                prompt_tokens,
                completion_tokens,
                settings.currency
            );
        }

        // Save to database
        await tokensContext.TokenUsage.add(tokenUsageRecord);

        console.log(`✅ Tokens: Usage record saved successfully (ID: ${tokenUsageRecord.id})`);

        // Check if we're approaching any limits and should send notifications
        if (settings) {
            await checkAndNotifyLimits(tokensContext, settings, currentUser, chatId);
        }

        // Return unmodified context
        return context;

    } catch (error) {
        console.error('❌ Tokens Plugin: Error in LLM_AFTER_GENERATE handler:', error.message);
        console.error(error.stack);

        // On error, return unmodified context (fail gracefully)
        return context;
    }
}

/**
 * Calculate estimated cost based on model pricing
 * @param {string} modelName - Name of the model used
 * @param {number} promptTokens - Number of prompt tokens
 * @param {number} completionTokens - Number of completion tokens
 * @param {string} currency - Currency for cost calculation
 * @returns {number|null} - Estimated cost in specified currency
 */
function calculateEstimatedCost(modelName, promptTokens, completionTokens, currency = 'USD') {
    // This is a simplified cost calculator
    // In production, you would want to maintain a pricing table in the database

    const pricingTable = {
        'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
        'gpt-4-turbo': { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
        'gpt-3.5-turbo': { prompt: 0.001 / 1000, completion: 0.002 / 1000 },
        'claude-3-opus': { prompt: 0.015 / 1000, completion: 0.075 / 1000 },
        'claude-3-sonnet': { prompt: 0.003 / 1000, completion: 0.015 / 1000 },
        'claude-3-haiku': { prompt: 0.00025 / 1000, completion: 0.00125 / 1000 },
    };

    const modelKey = Object.keys(pricingTable).find(key => modelName.toLowerCase().includes(key.toLowerCase()));

    if (!modelKey) {
        return null; // No pricing data available
    }

    const pricing = pricingTable[modelKey];
    const cost = (promptTokens * pricing.prompt) + (completionTokens * pricing.completion);

    return parseFloat(cost.toFixed(6));
}

/**
 * Check if usage is approaching limits and send notifications
 * @param {Object} tokensContext - Database context
 * @param {Object} settings - Token settings
 * @param {Object} currentUser - Current user object
 * @param {number} chatId - Current chat ID
 */
async function checkAndNotifyLimits(tokensContext, settings, currentUser, chatId) {
    if (!settings.notify_on_limit_reached) {
        return;
    }

    const threshold = settings.notify_threshold / 100; // Convert percentage to decimal

    // Check global limit
    if (settings.global_limit_enabled && settings.global_token_limit) {
        const periodStart = getPeriodStartTime(settings.global_limit_period);
        const totalUsage = await tokensContext.TokenUsage
            .where({ created_at: { $gte: periodStart } })
            .sum('total_tokens');

        const usagePercent = totalUsage / settings.global_token_limit;

        if (usagePercent >= threshold) {
            console.log(`⚠️  Tokens: Global usage at ${(usagePercent * 100).toFixed(1)}% of limit`);
            // TODO: Trigger notification system
        }
    }

    // Check per-user limit
    if (settings.per_user_limit_enabled && settings.per_user_token_limit && currentUser) {
        const periodStart = getPeriodStartTime(settings.per_user_limit_period);
        const userUsage = await tokensContext.TokenUsage
            .where({
                user_id: currentUser.id,
                created_at: { $gte: periodStart }
            })
            .sum('total_tokens');

        const usagePercent = userUsage / settings.per_user_token_limit;

        if (usagePercent >= threshold) {
            console.log(`⚠️  Tokens: User ${currentUser.id} usage at ${(usagePercent * 100).toFixed(1)}% of limit`);
            // TODO: Trigger notification system
        }
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
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return periodStart.getTime();
}

module.exports = handleLLMAfterGenerate;
