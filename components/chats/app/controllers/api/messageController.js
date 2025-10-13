const master = require('mastercontroller');

// Import services
const MessagePersistenceService = require(`${master.root}/components/chats/app/service/messagePersistenceService`);
const ChatHistoryService = require(`${master.root}/components/chats/app/service/chatHistoryService`);
const ModelService = require(`${master.root}/components/chats/app/service/modelService`);
const ToolsService = require(`${master.root}/components/chats/app/service/toolsService`);
const llmConfigService = require(`${master.root}/components/models/app/service/llmConfigService`);
const ModelRouterService = require(`${master.root}/components/chats/app/service/modelRouterService`);
const crypto = require('crypto');

class messageController {

    modelConfig = null;
    modelSettings = null;

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;
        this._modelContext = req.modelContext;

        // Use ModelService singleton to prevent memory leaks
        this.modelService = ModelService.getInstance();
    }


    generateSessionId(length = 32) {
        const toolsService = new ToolsService();
        return toolsService.generateSessionId(length);
    }

    /**
     * Enhanced context window management that respects model's contextSize limit
     * Estimates tokens and trims messages to fit within context window
     */
    async manageContextWindow(messageHistory) {
        // Get context limits from model configuration
        const contextSize = this.modelSettings.contextSize; // derived for UI; not from settings.context_size
        const maxResponseTokens = this.modelSettings.maxTokens;
        const reservedTokens = 200; // Reserve for system prompt, formatting, etc.
        
        // Calculate available tokens for conversation history
        const availableTokens = contextSize - maxResponseTokens - reservedTokens;
    
        
        // Estimate tokens for each message
        const messagesWithTokens = [];
        let totalHistoryTokens = 0;
        
        // Process messages in reverse order (newest first) to prioritize recent context
        for (let i = messageHistory.length - 1; i >= 0; i--) {
            const message = messageHistory[i];
            const toolsService = new ToolsService();
            const estimatedTokens = await toolsService.calculateTokenCount(message.content || '');
            
            // Add formatting overhead (role tags, etc.)
            const formattingOverhead = message.role === 'user' ? 10 : 15; // Approximate tokens for role formatting
            const totalMessageTokens = estimatedTokens + formattingOverhead;
            
            messagesWithTokens.unshift({
                ...message,
                estimatedTokens: estimatedTokens,
                totalTokens: totalMessageTokens,
                index: i
            });
            
            totalHistoryTokens += totalMessageTokens;
        }
        
        console.log(`Total estimated tokens in history: ${totalHistoryTokens}`);
        
        // If we're within limits, return all messages
        if (totalHistoryTokens <= availableTokens) {
            console.log(`✅ All messages fit within context window (${totalHistoryTokens}/${availableTokens} tokens)`);
            console.log(`=== END CONTEXT WINDOW MANAGEMENT ===\n`);
            return messageHistory;
        }
        
        // Need to trim messages - start from oldest and work forward
        console.log(`⚠️ Context window exceeded, trimming messages...`);
        
        const trimmedMessages = [];
        let runningTokenCount = 0;
        let userMessageCount = 0;
        let assistantMessageCount = 0;
        
        // Always keep the most recent user message (it's the current request)
        const mostRecentMessage = messagesWithTokens[messagesWithTokens.length - 1];
        if (mostRecentMessage && mostRecentMessage.role === 'user') {
            trimmedMessages.push(mostRecentMessage);
            runningTokenCount += mostRecentMessage.totalTokens;
            userMessageCount++;
            console.log(`  Keeping most recent user message: ${mostRecentMessage.totalTokens} tokens`);
        }
        
        // Add messages from newest to oldest, maintaining conversation pairs when possible
        for (let i = messagesWithTokens.length - 2; i >= 0; i--) {
            const message = messagesWithTokens[i];
            const potentialNewTotal = runningTokenCount + message.totalTokens;
            
            // Check if adding this message would exceed our limit
            if (potentialNewTotal > availableTokens) {
                console.log(`  Stopping at message ${i}: would exceed limit (${potentialNewTotal}/${availableTokens} tokens)`);
                break;
            }
            
            // Try to maintain conversation balance (don't have too many user messages without assistant responses)
            if (message.role === 'user') {
                // Only add user message if we have room and it maintains balance
                if (userMessageCount <= assistantMessageCount + 2) {
                    trimmedMessages.unshift(message);
                    runningTokenCount += message.totalTokens;
                    userMessageCount++;
                    console.log(`  Added user message: ${message.totalTokens} tokens (total: ${runningTokenCount})`);
                } else {
                    console.log(`  Skipping user message to maintain conversation balance`);
                }
            } else if (message.role === 'assistant') {
                trimmedMessages.unshift(message);
                runningTokenCount += message.totalTokens;
                assistantMessageCount++;
                console.log(`  Added assistant message: ${message.totalTokens} tokens (total: ${runningTokenCount})`);
            } else {
                // System messages - add if there's room
                trimmedMessages.unshift(message);
                runningTokenCount += message.totalTokens;
                console.log(`  Added system message: ${message.totalTokens} tokens (total: ${runningTokenCount})`);
            }
        }
        
        const originalCount = messageHistory.length;
        const trimmedCount = trimmedMessages.length;
        const trimmedTokens = originalCount > 0 ? Math.round((runningTokenCount / totalHistoryTokens) * 100) : 0;
        
        // Remove the token estimation properties before returning
        return trimmedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    async safeDisposeContext(context) {
        try {
            if (context && !context.disposed && typeof context.dispose === 'function') {
                await context.dispose();
            }
        } catch (e) {
            // Ignore disposal errors
            console.debug("Context disposal warning:", e.message);
        }
    }

    /**
     * Calculate total context size including conversation history and new message
     */
    async calculateTotalContextSize(messageHistory, newMessageContent) {
        const toolsService = new ToolsService();
        let totalTokens = 0;
        
        // Add tokens from existing conversation
        for (const message of messageHistory) {
            const messageTokens = await toolsService.calculateTokenCount(message.content || '');
            const formattingOverhead = message.role === 'user' ? 10 : 15;
            totalTokens += messageTokens + formattingOverhead;
        }
        
        // Add tokens from new message
        const newMessageTokens = await toolsService.calculateTokenCount(newMessageContent || '');
        totalTokens += newMessageTokens + 10; // User message formatting overhead
        
        // Add system prompt and formatting overhead
        const systemPromptTokens = await toolsService.calculateTokenCount(this.modelSettings.systemPrompt || '');
        totalTokens += systemPromptTokens + 50; // Extra formatting overhead
        
        return totalTokens;
    }

    /**
     * Get current context size for a chat session
     * MODEL-AWARE: Uses token estimation similar to model service (no tag parsing)
     */

    async getContextSize(obj) {
        try {
            // Handle CORS preflight
            if (obj.request.method === 'OPTIONS') {
                const origin = obj.request.headers.origin || '*';
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Authorization'
                });
                obj.response.end();
                return;
            }

            const formData = obj.params.formData || obj.params;
            const { chatId, currentInput, modelId } = formData;

            // ✅ CRITICAL: Load model configuration for the specific model
            const targetModelId = modelId;
            const modelResult = await llmConfigService.getModelConfig(targetModelId);
            this.modelConfig = modelResult;
            this.modelSettings = this.modelConfig.settings || {};

            // If model has no model.context_size defined or equals 0, feature not supported
            if (typeof this.modelConfig.context_size === 'undefined' || this.modelConfig.context_size === null || Number(this.modelConfig.context_size) === 0) {
                return this.returnJson({ success: true, notSupported: true, contextInfo: null });
            }

            const contextLimit = this.modelConfig.context_size; // authoritative from model
            const maxResponseTokens = this.modelSettings.max_tokens;

            // ✅ Use exact same method as model service
            const chatHistoryService = new ChatHistoryService(this._chatContext, this.modelSettings);
            const toolsService = new ToolsService();
            
            // Calculate current context size (existing messages only) - READ ONLY, don't modify messages
            let currentContextSize = 0;
            let messageCount = 0;
            if (chatId) {
                const existingHistory = await chatHistoryService.loadChatHistory(chatId);
                messageCount = existingHistory.length;
                
                // ✅ CRITICAL: DON'T call manageContextWindow here - just calculate size
                // Directly estimate tokens for each message, no tag parsing
                let formattedTokens = 0;
                for (const m of existingHistory) {
                    const messageTokens = await toolsService.calculateTokenCount(m.content || '');
                    const formattingOverhead = m.role === 'user' ? 10 : 15;
                    formattedTokens += messageTokens + formattingOverhead;
                }
                
                // Use model.system_prompt (not profile rules)
                const systemPrompt = (this.modelConfig.system_prompt || '').toString();
                const systemPromptTokens = await toolsService.calculateTokenCount(systemPrompt);
                
                currentContextSize = formattedTokens + systemPromptTokens + 50; // Extra formatting overhead
            }

            // Calculate size with potential new input - READ ONLY, don't modify messages
            let contextSizeWithInput = currentContextSize;
            if (currentInput && currentInput.trim()) {
                // Create temporary history with new input for size calculation ONLY
                const existingHistory = chatId ? await chatHistoryService.loadChatHistory(chatId) : [];
                const tempHistoryWithInput = [...existingHistory, { role: 'user', content: currentInput.trim() }];
                
                // Directly estimate tokens for messages + new input, no tag parsing
                let formattedTokensWithInput = 0;
                for (const m of tempHistoryWithInput) {
                    const messageTokens = await toolsService.calculateTokenCount(m.content || '');
                    const formattingOverhead = m.role === 'user' ? 10 : 15;
                    formattedTokensWithInput += messageTokens + formattingOverhead;
                }
                
                const systemPrompt = (this.modelConfig.system_prompt || '').toString();
                const systemPromptTokens = await toolsService.calculateTokenCount(systemPrompt);
                
                contextSizeWithInput = formattedTokensWithInput + systemPromptTokens + 50; // Extra formatting overhead
               
            }

            // Calculate available space for response
            const availableForResponse = Math.max(0, contextLimit - contextSizeWithInput);
            const recommendedMaxTokens = Math.min(maxResponseTokens, Math.floor(availableForResponse * 0.8));

            const responseData = {
                success: true,
                contextInfo: {
                    currentSize: currentContextSize,
                    sizeWithInput: contextSizeWithInput,
                    contextLimit: contextLimit,
                    maxResponseTokens: maxResponseTokens,
                    availableForResponse: availableForResponse,
                    recommendedMaxTokens: recommendedMaxTokens,
                    utilizationPercentage: Math.round((contextSizeWithInput / contextLimit) * 100),
                    wouldExceedLimit: contextSizeWithInput > contextLimit,
                    messageCount: contextSizeWithInput > currentContextSize ? messageCount + 1 : messageCount,
                    modelName: this.modelConfig.name,
                    modelId: targetModelId
                }
            };

            // Send proper HTTP response
             return this.returnJson(responseData);
           

        } catch (error) {
            console.error("Error getting context size:", error);
            
            // Use MasterController's returnJson method for error responses
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Resolve auto model selection to a concrete model ID
     * @param {string|number} modelId - Model ID or "auto"
     * @param {string} userPrompt - User's message content
     * @param {string|null} chatId - Chat ID for history
     * @returns {Promise<string|number>} - Resolved model ID
     */
    async resolveAutoModel(modelId, userPrompt, chatId) {
        // Check if this is an auto model request
        if (!ModelRouterService.isAutoModel(modelId)) {
            return modelId; // Return as-is if not auto
        }

        console.log('\n🎯 AUTO MODEL REQUESTED - Analyzing prompt...');

        try {
            // Get available published models for this user
            const availableModels = this._modelContext.Model
                .where(r => r.is_published == $$, 1)
                .orderBy(m => m.created_at)
                .toList();

            if (!availableModels || availableModels.length === 0) {
                console.log('⚠️  No published models available, cannot use auto selection');
                return await llmConfigService.getFirstPublishedModelId();
            }

            // Map to router-compatible format
            const mappedModels = availableModels.map(m => ({
                id: m.id,
                name: m.name,
                label: m.name,
                type: (m.name || '').toLowerCase()
            }));

            // Get conversation history for context
            let conversationHistory = [];
            let conversationTokenCount = 0;
            if (chatId) {
                try {
                    const chatHistoryService = new ChatHistoryService(this._chatContext, {});
                    conversationHistory = await chatHistoryService.loadChatHistory(chatId);

                    // Calculate token count from history
                    const toolsService = new ToolsService();
                    conversationTokenCount = toolsService.calculateTokenCount(conversationHistory);
                } catch (err) {
                    console.log('⚠️  Could not load chat history:', err.message);
                }
            }

            // Create router and select model
            const router = new ModelRouterService(mappedModels);
            const selectedModelId = router.selectModel(userPrompt, {
                conversationHistory,
                conversationTokenCount
            });

            if (selectedModelId) {
                console.log(`✅ AUTO SELECTION COMPLETE: Using model ID ${selectedModelId}\n`);
                return selectedModelId;
            }

            // Fallback to first available model
            console.log('⚠️  Auto selection failed, using fallback model');
            const fallback = router.getFallbackModel();
            return fallback || await llmConfigService.getFirstPublishedModelId();

        } catch (error) {
            console.error('❌ Error in auto model selection:', error.message);
            // Fallback to first available model on error
            return await llmConfigService.getFirstPublishedModelId();
        }
    }

    /**
     * Create user message in database first (DB-first approach)
     * Returns real message ID immediately for frontend use
     */
    async createUserMessage(obj) {
        try {

            // Handle CORS preflight
            if (obj.request.method === 'OPTIONS') {
                const origin = obj.request.headers.origin || '*';
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Authorization'
                });
                obj.response.end();
                return;
            }

            const formData = obj.params.formData || obj.params;
            let { content, chatId, modelId } = formData;

            // Validate input
            if (!content || content.trim() === '') {
                return this.returnJson({
                    success: false,
                    error: "Message content is required"
                });
            }

            // ✨ AUTO MODEL SELECTION: Resolve "auto" to concrete model ID
            const resolvedModelId = await this.resolveAutoModel(modelId, content, chatId);
            modelId = resolvedModelId;

            // Initialize persistence service
            const persistenceService = new MessagePersistenceService(this._chatContext, this._currentUser);

            // Save user message and get/create chat
            const { userMessage, chatId: finalChatId } = await persistenceService.saveUserMessage(formData, chatId);

            // Load model config (no model initialization here)
            const initResult = await llmConfigService.getModelConfig(modelId);
            this.modelConfig = initResult;
            this.modelSettings = this.modelConfig.settings || {};

            try {
                // Persist model metadata on the user message so it survives refreshes
                const userMsgEntity = this._chatContext.Messages
                    .where(m => m.id == $$, userMessage.id)
                    .single();
                if (userMsgEntity) {
                    const meta = {
                        model: this.modelConfig?.name,
                        modelId: this.modelConfig?.id
                    };
                    userMsgEntity.meta = JSON.stringify(meta);
                    this._chatContext.saveChanges();
                }
            } catch (metaErr) {
                console.error('⚠️ Failed to persist model meta on user message:', metaErr?.message);
            }

            return this.returnJson({
                success: true,
                temp_user_id: master.sessions.getCookie('temp_user_id', obj.request) || null,
                message: {
                    id: userMessage.id,
                    content: userMessage.content,
                    role: 'user',
                    createdAt: userMessage.created_at,
                    chatId: finalChatId,
                    model_id: userMessage.model_id,
                    meta: { model: this.modelConfig?.name, modelId: this.modelConfig?.id }
                },
                chatId: finalChatId
            });

        } catch (error) {
            console.error("Error creating user message:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }


    // startAIStreaming removed (use WebSocket socket=chat)
    // _startStreamingOpenAI removed (use WebSocket socket=chat)

    returnJson(obj) {
        return obj;
    }
}

// Note: Cleanup is now handled by ModelService
// The process cleanup listeners are set up in ModelService.setupGracefulShutdown()

module.exports = messageController;
