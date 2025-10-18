const master = require('mastercontroller');
const ToolsService = require(`${master.root}/components/chats/app/service/toolsService`);
const MediaService = require(`${master.root}/components/media/app/service/mediaService`);

/**
 * ChatHistoryService - Handles conversation history management and context window optimization
 * Responsibilities:
 * - Loading chat history from database
 * - Context window management and token estimation
 * - Message history trimming and optimization
 * - Conversation balance maintenance
 */
class ChatHistoryService {
    constructor(chatContext, modelSettings) {
        this._chatContext = chatContext;
        this.modelSettings = modelSettings;
        this.mediaService = new MediaService();
        // Get mediaContext from master singleton
        this._mediaContext = (master.requestList && master.requestList.mediaContext) ? master.requestList.mediaContext : null;
    }


    /**
     * Load chat history from database
     * @param {string|number} chatId - Chat ID to load history for
     * @param {string} baseUrl - Base URL for constructing image URLs (from request host)
     */
    async loadChatHistory(chatId, baseUrl = null) {
        try {
            console.log(`\n=== LOADING CHAT HISTORY FOR CHAT ${chatId} ===`);
            
            const existingMessages = this._chatContext.Messages
                .where(m => m.chat_id == $$, chatId)
                .orderBy(m => m.created_at)
                .toList();
            
            console.log(`Raw messages from DB: ${existingMessages.length}`);
            existingMessages.forEach((msg, i) => {
                console.log(`  ${i + 1}. [${msg.role}] (created: ${msg.created_at}): "${msg.content?.substring(0, 50)}..."`);
            });

            const messageHistory = [];

            // Add all existing messages to history
            for (const msg of existingMessages) {
                const role = msg.role;
                const content = msg.content;
                console.log(`Processing message - role: "${role}" (type: ${typeof role}), content length: ${content?.length || 0}`);

                if (role && content) {
                    // The role from DB is "Assistant", "User", or "System" (capitalized)
                    // We need to normalize to lowercase for consistency
                    const normalizedRole = role.toString().toLowerCase();
                    console.log(`  -> Normalized role: "${normalizedRole}"`);

                    const historyItem = {
                        role: normalizedRole,
                        content: content
                    };

                    // Get image URLs from MediaFile table via MediaService
                    if (this._mediaContext) {
                        try {
                            const imageUrls = this.mediaService.getImageUrlsForMessage(msg.id, this._mediaContext, baseUrl);
                            if (imageUrls && imageUrls.length > 0) {
                                historyItem.attachments = imageUrls;
                                console.log(`  -> Added ${imageUrls.length} image(s) from MediaFile for message ${msg.id}`);
                            }
                        } catch (e) {
                            console.warn(`Failed to fetch image URLs for message ${msg.id}:`, e);
                        }
                    }

                    // Also include any attachments already in the message
                    if (msg.attachments) {
                        try {
                            const existingAttachments = typeof msg.attachments === 'string'
                                ? JSON.parse(msg.attachments)
                                : msg.attachments;

                            // Merge with image URLs if both exist
                            if (historyItem.attachments && Array.isArray(existingAttachments)) {
                                historyItem.attachments = [...historyItem.attachments, ...existingAttachments];
                            } else if (existingAttachments) {
                                historyItem.attachments = existingAttachments;
                            }
                        } catch (e) {
                            console.warn('Failed to parse attachments:', e);
                        }
                    }

                    messageHistory.push(historyItem);
                }
            }
            
            console.log(`Loaded ${messageHistory.length} messages into history`);
            console.log(`=== END LOADING CHAT HISTORY ===\n`);
            
            return messageHistory;
        } catch (error) {
            console.error("Error loading chat history:", error);
            return [];
        }
    }

    /**
     * Enhanced context window management that respects model's contextSize limit
     * Estimates tokens and trims messages to fit within context window
     */
    async manageContextWindow(messageHistory) {
        // Get context limits from model configuration
        const contextSize = this.modelSettings.contextSize; // retained for UI stats; not from settings.context_size
        const maxResponseTokens = this.modelSettings.maxTokens;
        const reservedTokens = 200; // Reserve for system prompt, formatting, etc.
        
        // Calculate available tokens for conversation history
        const availableTokens = contextSize - maxResponseTokens - reservedTokens;
        
        console.log(`\n=== CONTEXT WINDOW MANAGEMENT ===`);
        console.log(`Model: ${this.modelSettings.name || 'Unknown'}`);
        console.log(`Total context size: ${contextSize} tokens`);
        console.log(`Reserved for response: ${maxResponseTokens} tokens`);
        console.log(`Reserved for system/formatting: ${reservedTokens} tokens`);
        console.log(`Available for history: ${availableTokens} tokens`);
        
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
        
        console.log(`📝 Context trimming summary:`);
        console.log(`  Original: ${originalCount} messages (${totalHistoryTokens} tokens)`);
        console.log(`  Trimmed: ${trimmedCount} messages (${runningTokenCount} tokens)`);
        console.log(`  Removed: ${originalCount - trimmedCount} messages`);
        console.log(`  Token usage: ${runningTokenCount}/${availableTokens} (${Math.round((runningTokenCount/availableTokens)*100)}%)`);
        console.log(`  Conversation balance: ${userMessageCount} user, ${assistantMessageCount} assistant`);
        console.log(`=== END CONTEXT WINDOW MANAGEMENT ===\n`);
        
        // Remove the token estimation properties before returning
        return trimmedMessages.map(msg => {
            const result = {
                role: msg.role,
                content: msg.content
            };
            if (msg.attachments) {
                result.attachments = msg.attachments;
            }
            return result;
        });
    }

    /**
     * Prepare complete message history including current user message
     */
    async prepareMessageHistory(chatId, currentUserMessage) {
        let messageHistory = [];

        // Load existing history if this is an existing chat
        if (chatId) {
            messageHistory = await this.loadChatHistory(chatId);
        }

        // Add current user message
        messageHistory.push({
            role: "user",
            content: currentUserMessage
        });

        // Apply enhanced context window management based on model config
        const managedHistory = await this.manageContextWindow(messageHistory);
        console.log(`After context management: ${managedHistory.length} messages (trimmed: ${messageHistory.length - managedHistory.length})`);

        return managedHistory;
    }

    /**
     * Validate message history format
     */
    validateMessageHistory(messageHistory) {
        if (!Array.isArray(messageHistory)) {
            throw new Error('Message history must be an array');
        }

        for (let i = 0; i < messageHistory.length; i++) {
            const msg = messageHistory[i];
            if (!msg.role || !msg.content) {
                throw new Error(`Message at index ${i} is missing role or content`);
            }
            if (!['user', 'assistant', 'system'].includes(msg.role.toLowerCase())) {
                throw new Error(`Invalid role "${msg.role}" at message index ${i}`);
            }
        }

        return true;
    }

    /**
     * Get conversation statistics
     */
    getConversationStats(messageHistory) {
        const stats = {
            totalMessages: messageHistory.length,
            userMessages: 0,
            assistantMessages: 0,
            systemMessages: 0,
            totalTokens: 0
        };

        for (const msg of messageHistory) {
            const role = msg.role.toLowerCase();
            if (role === 'user') {
                stats.userMessages++;
            } else if (role === 'assistant') {
                stats.assistantMessages++;
            } else if (role === 'system') {
                stats.systemMessages++;
            }
            stats.totalTokens += Math.ceil(msg.content.length / 4);
        }

        return stats;
    }

    /**
     * Extract user prompt from message history
     */
    extractUserPrompt(messageHistory) {
        // Extract the last user message as the current prompt
        for (let i = messageHistory.length - 1; i >= 0; i--) {
            if (messageHistory[i].role === 'user') {
                return messageHistory[i].content;
            }
        }
        throw new Error('No user message found in conversation history');
    }

    /**
     * Truncate user prompt if too long for context
     */
    truncateUserPromptIfNeeded(userPrompt, contextSize) {
        const maxUserPromptTokens = Math.floor(contextSize * 0.4); // Use only 40% of context for user prompt
        const maxUserPromptLength = maxUserPromptTokens * 3; // Rough estimate: 3 chars per token
        
        if (userPrompt.length > maxUserPromptLength) {
            console.warn(`User prompt too long (${userPrompt.length} chars), truncating to ${maxUserPromptLength} chars`);
            return userPrompt.substring(0, maxUserPromptLength);
        }
        
        return userPrompt;
    }
}

module.exports = ChatHistoryService;
