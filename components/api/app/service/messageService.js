const master = require('mastercontroller');
const ModelService = require(`${master.root}/components/chats/app/service/modelService`);
const llmConfigService = require(`${master.root}/components/models/app/service/llmConfigService`);
const { HOOKS } = require(`${master.root}/components/plugins/app/core/hookConstants`);
const hookService = require(`${master.root}/components/plugins/app/core/hookRegistration`);

/**
 * MessageService - External API Chat Integration Service
 *
 * Provides LLM chat capabilities for external API consumers with:
 * - API key authentication and validation
 * - Rate limiting and usage tracking
 * - Session-based conversation history
 * - Hook integration for extensibility
 * - Token accounting and billing support
 *
 * Usage:
 * ```javascript
 * const messageService = new MessageService(apiContext);
 * const response = await messageService.process(apiKey, message, sessionId);
 * ```
 */
class MessageService {
    /**
     * @param {Object} apiContext - Database context for API component
     */
    constructor(apiContext) {
        if (!apiContext) {
            throw new Error('API context is required for MessageService');
        }
        this.apiContext = apiContext;
        this.modelService = ModelService.getInstance();
    }

    /**
     * Process a chat message through the LLM with full hook integration
     *
     * @param {string} apiKey - API key for authentication
     * @param {string|Object} message - User message (string or {role, content})
     * @param {string} sessionId - Session identifier for conversation history
     * @param {Object} options - Optional processing options
     * @param {boolean} options.stream - Enable streaming response (default: false)
     * @param {Function} options.onChunk - Streaming callback function
     * @param {Object} options.modelOverride - Override model configuration
     * @returns {Promise<Object>} Response with message, tokens, usage stats
     */
    async process(apiKey, message, sessionId, options = {}) {
        const startTime = Date.now();
        const opts = {
            stream: false,
            onChunk: null,
            modelOverride: null,
            ...options
        };

        try {
            // Step 1: Validate API key and get API configuration
            console.log(`🔐 [MessageService] Validating API key: ${apiKey?.substring(0, 8)}...`);
            const apiRecord = await this.validateApiKey(apiKey);

            // Step 2: Check rate limits
            console.log(`🚦 [MessageService] Checking rate limits for API ${apiRecord.id}...`);
            await this.checkRateLimits(apiRecord);

            // Step 3: Load or create session
            console.log(`💬 [MessageService] Loading session: ${sessionId}...`);
            const session = await this.getOrCreateSession(apiRecord.id, sessionId, apiRecord.user_id);

            // Step 4: Check session limits
            console.log(`📊 [MessageService] Checking session limits...`);
            await this.checkSessionLimits(apiRecord, session);

            // Step 5: Load model configuration
            console.log(`🤖 [MessageService] Loading model configuration...`);
            const modelConfig = await this.getModelConfig(apiRecord, opts.modelOverride);

            // Step 6: Build message history
            console.log(`📚 [MessageService] Building message history...`);
            let messageHistory = this.buildMessageHistory(session, message);

            // Step 7: 🔌 Fire API_CHAT_BEFORE_MESSAGE hook (Filter)
            console.log(`🔌 [MessageService] Firing API_CHAT_BEFORE_MESSAGE hook...`);
            try {
                const hookContext = {
                    message,
                    messageHistory,
                    sessionId: session.session_id,
                    apiId: apiRecord.id,
                    apiKey: apiRecord.api_key,
                    userId: apiRecord.user_id,
                    modelConfig,
                    session
                };

                const hookResult = await hookService.applyFilters(
                    HOOKS.API_CHAT_BEFORE_MESSAGE,
                    hookContext
                );

                // Apply modifications from hook
                if (hookResult && hookResult.messageHistory) {
                    messageHistory = hookResult.messageHistory;
                    console.log(`✅ [MessageService] Hook modified message history`);
                }
                if (hookResult && hookResult.message) {
                    message = hookResult.message;
                }
            } catch (hookErr) {
                console.error('⚠️  [MessageService] API_CHAT_BEFORE_MESSAGE hook failed (non-fatal):', hookErr);
            }

            // Step 8: Generate LLM response
            console.log(`🎯 [MessageService] Generating LLM response...`);
            let responseText = '';
            let tokenCount = 0;

            if (opts.stream && typeof opts.onChunk === 'function') {
                // Streaming mode
                const tokenCallback = async (chunk) => {
                    responseText += chunk;
                    tokenCount = Math.ceil(responseText.length / 4); // Rough token estimate
                    opts.onChunk(chunk);
                };

                await this.modelService._generate(
                    messageHistory,
                    tokenCallback,
                    false, // noThinking
                    modelConfig
                );
            } else {
                // Non-streaming mode: accumulate response
                let fullResponse = '';
                const tokenCallback = async (chunk) => {
                    fullResponse += chunk;
                };

                await this.modelService._generate(
                    messageHistory,
                    tokenCallback,
                    false,
                    modelConfig
                );

                responseText = fullResponse;
                tokenCount = Math.ceil(responseText.length / 4);
            }

            // Step 9: 🔌 Fire API_CHAT_AFTER_RESPONSE hook (Filter)
            console.log(`🔌 [MessageService] Firing API_CHAT_AFTER_RESPONSE hook...`);
            const processingTime = Date.now() - startTime;

            try {
                const hookContext = {
                    response: responseText,
                    message,
                    messageHistory,
                    sessionId: session.session_id,
                    apiId: apiRecord.id,
                    apiKey: apiRecord.api_key,
                    userId: apiRecord.user_id,
                    tokens: tokenCount,
                    processingTime,
                    modelConfig,
                    session
                };

                const hookResult = await hookService.applyFilters(
                    HOOKS.API_CHAT_AFTER_RESPONSE,
                    hookContext
                );

                // Apply response modifications from hook
                if (hookResult && hookResult.response) {
                    responseText = hookResult.response;
                    console.log(`✅ [MessageService] Hook modified response`);
                }
            } catch (hookErr) {
                console.error('⚠️  [MessageService] API_CHAT_AFTER_RESPONSE hook failed (non-fatal):', hookErr);
            }

            // Step 10: Update session with new messages and usage stats
            console.log(`💾 [MessageService] Updating session...`);
            await this.updateSession(session, message, responseText, tokenCount);

            // Step 11: Update API usage statistics
            console.log(`📈 [MessageService] Updating API usage stats...`);
            await this.updateApiUsage(apiRecord);

            // Step 12: 🔌 Fire API_SESSION_CREATED hook (Action) if this is a new session
            if (session._isNewSession) {
                console.log(`🔌 [MessageService] Firing API_SESSION_CREATED hook...`);
                try {
                    await hookService.doAction(HOOKS.API_SESSION_CREATED, {
                        apiId: apiRecord.id,
                        sessionId: session.session_id,
                        apiKey: apiRecord.api_key,
                        userId: apiRecord.user_id
                    });
                } catch (hookErr) {
                    console.error('⚠️  [MessageService] API_SESSION_CREATED hook failed (non-fatal):', hookErr);
                }
            }

            console.log(`✅ [MessageService] Request processed successfully in ${processingTime}ms`);

            // Return response with metadata
            return {
                success: true,
                response: responseText,
                sessionId: session.session_id,
                tokens: tokenCount,
                model: modelConfig.name,
                usage: {
                    promptTokens: Math.ceil((messageHistory.reduce((sum, m) => sum + (m.content?.length || 0), 0)) / 4),
                    completionTokens: tokenCount,
                    totalTokens: Math.ceil((messageHistory.reduce((sum, m) => sum + (m.content?.length || 0), 0)) / 4) + tokenCount
                },
                processingTime
            };

        } catch (error) {
            console.error(`❌ [MessageService] Error processing message:`, error);

            // Check if it's a rate limit error
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
                // Fire rate limit hook
                try {
                    await hookService.doAction(HOOKS.API_RATE_LIMIT_EXCEEDED, error.context);
                } catch (hookErr) {
                    console.error('⚠️  [MessageService] API_RATE_LIMIT_EXCEEDED hook failed:', hookErr);
                }
            }

            throw error;
        }
    }

    /**
     * Validate API key and return API record
     * @private
     */
    async validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            const error = new Error('API key is required');
            error.code = 'INVALID_API_KEY';
            throw error;
        }

        const apiRecord = this.apiContext.Api
            .where(r => r.api_key == $$, apiKey)
            .toList()[0];

        if (!apiRecord) {
            const error = new Error('Invalid API key');
            error.code = 'INVALID_API_KEY';
            throw error;
        }

        if (!apiRecord.is_active) {
            const error = new Error('API key is inactive');
            error.code = 'INACTIVE_API_KEY';
            throw error;
        }

        return apiRecord;
    }

    /**
     * Check rate limits for API
     * @private
     */
    async checkRateLimits(apiRecord) {
        const now = Date.now();
        const windowMs = (apiRecord.rate_limit_window || 60) * 1000; // Convert to milliseconds
        const windowStart = now - windowMs;

        // Count requests in current window
        const recentRequests = this.apiContext.ApiSession
            .where(r => r.api_id == $$, apiRecord.id)
            .where(r => parseInt(r.last_activity_at || '0') > $$, windowStart.toString())
            .count();

        const limit = apiRecord.rate_limit_requests || 100;

        if (recentRequests >= limit) {
            const error = new Error('Rate limit exceeded');
            error.code = 'RATE_LIMIT_EXCEEDED';
            error.context = {
                apiId: apiRecord.id,
                apiKey: apiRecord.api_key,
                currentCount: recentRequests,
                limit: limit,
                window: apiRecord.rate_limit_window
            };
            throw error;
        }

        console.log(`✅ [MessageService] Rate limit check passed: ${recentRequests}/${limit} requests`);
    }

    /**
     * Get or create session
     * @private
     */
    async getOrCreateSession(apiId, sessionId, userId) {
        let session = this.apiContext.ApiSession
            .where(r => r.session_id == $$, sessionId)
            .toList()[0];

        if (!session) {
            // Create new session
            session = this.apiContext.ApiSession.create();
            session.api_id = apiId;
            session.session_id = sessionId;
            session.user_id = userId;
            session.messages = [];
            session.message_count = 0;
            session.total_tokens_used = 0;
            session.is_active = true;
            session.last_activity_at = Date.now().toString();
            session.created_at = Date.now().toString();
            session.updated_at = Date.now().toString();

            await this.apiContext.saveChanges();
            session._isNewSession = true;
            console.log(`✅ [MessageService] Created new session: ${sessionId}`);
        } else {
            session._isNewSession = false;
            console.log(`✅ [MessageService] Loaded existing session: ${sessionId} (${session.message_count} messages)`);
        }

        return session;
    }

    /**
     * Check session limits
     * @private
     */
    async checkSessionLimits(apiRecord, session) {
        const maxMessages = apiRecord.max_messages_per_session || 50;

        if (session.message_count >= maxMessages) {
            const error = new Error('Session message limit exceeded');
            error.code = 'SESSION_LIMIT_EXCEEDED';
            throw error;
        }

        console.log(`✅ [MessageService] Session limit check passed: ${session.message_count}/${maxMessages} messages`);
    }

    /**
     * Get model configuration
     * @private
     */
    async getModelConfig(apiRecord, modelOverride) {
        let modelId = modelOverride?.id || apiRecord.model_id;

        if (!modelId) {
            const error = new Error('No model configured for this API key');
            error.code = 'NO_MODEL_CONFIGURED';
            throw error;
        }

        const modelConfig = await llmConfigService.getModelConfig(modelId);

        if (!modelConfig) {
            const error = new Error('Model not found');
            error.code = 'MODEL_NOT_FOUND';
            throw error;
        }

        console.log(`✅ [MessageService] Loaded model: ${modelConfig.name}`);
        return modelConfig;
    }

    /**
     * Build message history from session
     * @private
     */
    buildMessageHistory(session, newMessage) {
        const history = [];

        // Add existing messages from session
        if (session.messages && Array.isArray(session.messages)) {
            history.push(...session.messages);
        }

        // Add new user message
        if (typeof newMessage === 'string') {
            history.push({
                role: 'user',
                content: newMessage
            });
        } else if (newMessage && newMessage.role && newMessage.content) {
            history.push(newMessage);
        } else {
            throw new Error('Invalid message format');
        }

        console.log(`✅ [MessageService] Built message history: ${history.length} messages`);
        return history;
    }

    /**
     * Update session with new messages
     * @private
     */
    async updateSession(session, userMessage, assistantResponse, tokenCount) {
        const messages = session.messages || [];

        // Add user message
        messages.push({
            role: 'user',
            content: typeof userMessage === 'string' ? userMessage : userMessage.content,
            timestamp: Date.now()
        });

        // Add assistant response
        messages.push({
            role: 'assistant',
            content: assistantResponse,
            timestamp: Date.now(),
            tokens: tokenCount
        });

        // Update session
        session.messages = messages;
        session.message_count = messages.length;
        session.total_tokens_used = (session.total_tokens_used || 0) + tokenCount;
        session.last_activity_at = Date.now().toString();
        session.updated_at = Date.now().toString();

        await this.apiContext.saveChanges();
        console.log(`✅ [MessageService] Session updated: ${session.message_count} messages, ${session.total_tokens_used} total tokens`);
    }

    /**
     * Update API usage statistics
     * @private
     */
    async updateApiUsage(apiRecord) {
        apiRecord.total_requests = (apiRecord.total_requests || 0) + 1;
        apiRecord.last_used_at = Date.now().toString();
        apiRecord.updated_at = Date.now().toString();

        await this.apiContext.saveChanges();
        console.log(`✅ [MessageService] API usage updated: ${apiRecord.total_requests} total requests`);
    }

    /**
     * Get session statistics
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Session statistics
     */
    async getSessionStats(sessionId) {
        const session = this.apiContext.ApiSession
            .where(r => r.session_id == $$, sessionId)
            .toList()[0];

        if (!session) {
            throw new Error('Session not found');
        }

        return {
            sessionId: session.session_id,
            messageCount: session.message_count,
            totalTokens: session.total_tokens_used,
            isActive: session.is_active,
            createdAt: session.created_at,
            lastActivity: session.last_activity_at
        };
    }

    /**
     * Clear session history
     * @param {string} sessionId - Session identifier
     */
    async clearSession(sessionId) {
        const session = this.apiContext.ApiSession
            .where(r => r.session_id == $$, sessionId)
            .toList()[0];

        if (!session) {
            throw new Error('Session not found');
        }

        session.messages = [];
        session.message_count = 0;
        session.updated_at = Date.now().toString();

        await this.apiContext.saveChanges();
        console.log(`✅ [MessageService] Session cleared: ${sessionId}`);
    }
}

module.exports = MessageService;
