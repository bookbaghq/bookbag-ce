/**
 * Tokens Plugin: CHAT_AFTER_MESSAGE Hook Handler
 *
 * This handler runs after a user message is saved to the database to:
 * 1. Log message-level events for audit trail
 * 2. Update aggregate statistics if needed
 * 3. Trigger any additional message-level tracking
 *
 * Note: Most token tracking happens in LLM_AFTER_GENERATE
 * This hook is mainly for message-level audit trail and events
 *
 * @param {Object} context - Hook context containing message and metadata
 * @returns {void}
 */

async function handleChatAfterMessage(context) {
    try {
        console.log('📊 Tokens Plugin: CHAT_AFTER_MESSAGE hook triggered');

        // Extract parameters from hook context
        const {
            message,
            userId,
            chatId,
            messageId
        } = context;

        // Log message event
        console.log(`📝 Tokens: Message saved - Chat: ${chatId}, User: ${userId}, Message: ${messageId}`);

        // This hook is intentionally minimal since detailed token tracking
        // happens in LLM_AFTER_GENERATE. This is mainly for audit trail.

        // Potential future enhancements:
        // - Update real-time dashboards
        // - Trigger webhooks for message events
        // - Update message counters for rate limiting
        // - Log to external analytics services

    } catch (error) {
        console.error('❌ Tokens Plugin: Error in CHAT_AFTER_MESSAGE handler:', error.message);
        console.error(error.stack);
        // Fail gracefully - don't interrupt the chat flow
    }
}

module.exports = handleChatAfterMessage;
