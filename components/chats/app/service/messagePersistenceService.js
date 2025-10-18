const master = require('mastercontroller');
const chatEntity = require(`${master.root}/components/chats/app/models/chat`);
const messagesEntity = require(`${master.root}/components/chats/app/models/messages`);
const userChatEntity = require(`${master.root}/components/chats/app/models/userchat`);
const crypto = require('crypto');
const ToolsService = require(`${master.root}/components/chats/app/service/toolsService`);

/**
 * MessagePersistenceService - Handles all database operations for messages and chats
 * Responsibilities:
 * - Message creation and updates
 * - Chat creation and management
 * - Token counting
 * - Database state management
 */
class MessagePersistenceService {
    constructor(chatContext, currentUser) {
        this._chatContext = chatContext;
        this._currentUser = currentUser;
        // Hybrid throttle/debounce state (per message)
        this._lastUpdateTimeByMessage = new Map();
        this._debounceTimersByMessage = new Map();
        this._pendingArgsByMessage = new Map();
        this._updateIntervalMs = 500; // default interval
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Retry helper for transient SQLite locks
    async _saveWithRetry(maxRetries = 5, baseDelayMs = 100) {
        let attempt = 0;
        while (true) {
            try {
                this._chatContext.saveChanges();
                return; // success
            } catch (err) {
                const message = (err && err.message) ? err.message : '';
                const isLocked = message.includes('database is locked') || message.includes('SQLITE_BUSY');
                if (!isLocked || attempt >= maxRetries) {
                    throw err;
                }
                // Exponential backoff with jitter
                const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
                console.warn(`⚠️ SQLite locked. Retrying saveChanges in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(res => setTimeout(res, delay));
                attempt++;
            }
        }
    }

    /**
     * Save user message to database
     */
    async saveUserMessage(formData, chatId = null) {
        const timestamp = Date.now().toString();
        const toolsService = new ToolsService();
        const rawContent = formData?.content;
        const contentStr = (typeof rawContent === 'string') ? rawContent : JSON.stringify(rawContent ?? '');
        const userTokenCount = await toolsService.calculateTokenCount(contentStr);
        let userMessage;

        try {
            if (chatId) {
                // Update the chat's total token count after verifying membership via UserChat
                const chat = this._chatContext.Chat
                    .where(c => c.id == $$, chatId)
                    .single();
                if (!chat) {
                    throw new Error('Chat not found');
                }
                // Membership check via join table
                const membership = this._chatContext.UserChat
                    .where(uc => uc.chat_id == $$ && uc.user_id == $$, chatId, this._currentUser.id)
                    .single();
                if (!membership) {
                    throw new Error('Access denied');
                }
                chat.total_token_count += userTokenCount;
                chat.updated_at = timestamp;
                // Existing chat - add message to it
                userMessage = new messagesEntity();
                userMessage.Chat = chatId;
                userMessage.role = "user";
                userMessage.content = contentStr;
                userMessage.model_id = Number.parseInt(formData.modelId, 10) || 0;
                if (formData.modelId) {
                    // Persist model info in meta so UI can display human-readable name
                    userMessage.meta = JSON.stringify({ modelId: formData.modelId });
                }
                // Add attachments if provided
                if (formData.attachments && Array.isArray(formData.attachments) && formData.attachments.length > 0) {
                    userMessage.attachments = JSON.stringify(formData.attachments);
                }
                userMessage.user_id = this._currentUser.id;
                userMessage.token_count = userTokenCount;
                userMessage.created_at = timestamp;
                userMessage.updated_at = timestamp;
                
                this._chatContext.Messages.add(userMessage);
                await this._saveWithRetry();
                
                return { userMessage, chatId };
            } else {
                // New chat - create chat and message
                const chat = new chatEntity();
                chat.created_at = timestamp;
                chat.updated_at = timestamp;
                chat.session_id = this.generateSessionId();
                chat.total_token_count = userTokenCount;
                chat.title = contentStr.substring(0, 50) + (contentStr.length > 50 ? "..." : "");
                
                userMessage = new messagesEntity();
                userMessage.role = "user";
                userMessage.content = contentStr;
                userMessage.model_id = Number.parseInt(formData.modelId, 10) || 0;
                if (formData.modelId) {
                    userMessage.meta = JSON.stringify({ modelId: formData.modelId });
                }
                // Add attachments if provided
                if (formData.attachments && Array.isArray(formData.attachments) && formData.attachments.length > 0) {
                    userMessage.attachments = JSON.stringify(formData.attachments);
                }
                userMessage.user_id = this._currentUser.id;
                userMessage.token_count = userTokenCount;
                userMessage.created_at = timestamp;
                userMessage.updated_at = timestamp;
                
                chat.Messages = [userMessage];
                this._chatContext.Chat.add(chat);
                await this._saveWithRetry();

                // Now create join record linking current user to this chat
                const userChat = new userChatEntity();
                userChat.Chat = chat.id;
                userChat.user_id = this._currentUser.id;
                userChat.created_at = timestamp;
                userChat.updated_at = timestamp;
                this._chatContext.UserChat.add(userChat);
                await this._saveWithRetry();

                return { userMessage, chatId: chat.id };
            }
        } catch (error) {
            console.error("Error saving user message:", error);
            const msg = (error && (error.message || typeof error === 'string')) ? (error.message || String(error)) : 'Unknown error';
            throw new Error('Failed to save user message: ' + msg);
        }
    }

    /**
     * Create AI message placeholder early in the process
     */
    async createAssistantMessageOnStreamStart(chatId, modelConfig, modelSettings) {
        const timestamp = Date.now().toString();
        const generationStartTime = Date.now();

        try {
            // Bump chat updated_at so lists reflect immediate activity
            try {
                const chat = this._chatContext.Chat
                    .where(c => c.id == $$, chatId)
                    .single();
                if (chat) {
                    // Only update if the current user is a member of the chat
                    const membership = this._chatContext.UserChat
                        .where(uc => uc.chat_id == $$ && uc.user_id == $$, chatId, this._currentUser.id)
                        .single();
                    if (membership) {
                        chat.updated_at = timestamp;
                    }
                }
            } catch (_) {}

            const aiMessage = new messagesEntity();
            aiMessage.Chat = chatId;
            aiMessage.role = "assistant";
            aiMessage.user_id = this._currentUser.id;
            aiMessage.content = "-";
            aiMessage.model_id = Number.parseInt(modelConfig?.id, 10) || 0;
            aiMessage.token_count = 0;
            // Only set a cap when the model defines a real context_size (> 0)
            const ctxSize = Number((modelConfig && modelConfig.context_size) ?? 0);
            if (Number.isFinite(ctxSize) && ctxSize > 0) {
                const maxFromSettings = Number(modelSettings.maxTokens ?? modelSettings.max_tokens ?? ctxSize);
                aiMessage.max_tokens = (Number.isFinite(maxFromSettings) && maxFromSettings > 0) ? maxFromSettings : ctxSize;
            } else {
                aiMessage.max_tokens = 0;
            }
            aiMessage.tokens_per_seconds = 0;
            aiMessage.created_at = timestamp;
            aiMessage.updated_at = timestamp;
            aiMessage.meta = JSON.stringify({
                model: modelConfig.name,
                modelId: modelConfig.id,
                temperature: modelSettings.temperature,
                streaming: true,
                generationStartTime: generationStartTime
            });

            this._chatContext.Messages.add(aiMessage);
            await this._saveWithRetry();

            console.log(`🚀 AI message created on stream start with ID: ${aiMessage.id}`);
            return { aiMessage, aiMessageId: aiMessage.id, generationStartTime };
        } catch (error) {
            console.error("Error creating assistant message on stream start:", error);
            throw new Error('Failed to create assistant message on stream start: ' + error.message);
        }
    }

    /**
     * Internal helper to perform the actual streaming update (no throttling here)
     */
    async _performStreamingUpdate(aiMessageId, cleanContent, tokenCount, currentTPS, thinkingSectionsCount, generationStartTime) {
        const currentTime = Date.now();
        // Retry logic for race conditions
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
            try {
                const currentMessage = this._chatContext.Messages
                    .where(m => m.id == $$, aiMessageId)
                    .single();

                if (currentMessage) {
                    // Update message with CLEAN content (must be non-empty for notNullable constraint)
                    currentMessage.content = (typeof cleanContent === 'string' && cleanContent.length > 0) ? cleanContent : "-";
                    currentMessage.token_count = tokenCount;
                    currentMessage.tokens_per_seconds = currentTPS;
                    currentMessage.updated_at = Date.now().toString();

                    // Also bump parent chat updated_at to reflect activity
                    try {
                        const parentChatId = currentMessage.Chat; // belongsTo mapping stores id
                        if (parentChatId) {
                            const chat = this._chatContext.Chat
                                .where(c => c.id == $$, parentChatId)
                                .single();
                            if (chat) {
                                chat.updated_at = Date.now().toString();
                            }
                        }
                    } catch (_) {}

                    // Update metadata
                    const metadata = JSON.parse(currentMessage.meta || '{}');
                    metadata.currentTokens = tokenCount;
                    metadata.currentTPS = currentTPS;
                    metadata.elapsedMs = currentTime - generationStartTime;
                    metadata.thinkingSectionsFound = thinkingSectionsCount;
                    metadata.lastStreamUpdate = currentTime;
                    currentMessage.meta = JSON.stringify(metadata);

                    this._chatContext.saveChanges();

                    console.log(`💾 Hybrid update: ${tokenCount} tokens (clean), ${currentTPS} TPS, ${thinkingSectionsCount} thinking sections`);
                    return { updated: true, lastUpdateTime: currentTime };
                } else {
                    console.error(`❌ Could not find message ${aiMessageId} for streaming update (attempt ${retryCount + 1})`);
                    if (retryCount < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        retryCount++;
                        continue;
                    } else {
                        return { updated: false, lastUpdateTime: this._lastUpdateTimeByMessage.get(aiMessageId) || 0, error: 'Message not found' };
                    }
                }
            } catch (dbError) {
                console.error(`❌ Database error during streaming update (attempt ${retryCount + 1}):`, dbError);
                if (retryCount < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    retryCount++;
                    continue;
                } else {
                    throw dbError;
                }
            }
        }
    }

    /**
     * Update AI message during streaming (Hybrid Throttle + Debounce)
     */
    async updateAIMessageStreaming(aiMessageId, cleanContent, tokenCount, currentTPS, thinkingSectionsCount, generationStartTime, _lastUpdateTimeIgnored) {
        try {
            const now = Date.now();
            const interval = this._updateIntervalMs;

            // Store latest args for potential trailing debounce flush
            this._pendingArgsByMessage.set(aiMessageId, { cleanContent, tokenCount, currentTPS, thinkingSectionsCount, generationStartTime });

            const lastUpdate = this._lastUpdateTimeByMessage.get(aiMessageId) || 0;
            const timeSinceLast = now - lastUpdate;

            let leadingFlushed = false;
            let lastUpdateTime = lastUpdate;

            // Throttle (leading edge): flush if sufficient time has passed or during very early phase (<10 tokens)
            if (timeSinceLast >= interval || tokenCount < 10) {
                const result = await this._performStreamingUpdate(aiMessageId, cleanContent, tokenCount, currentTPS, thinkingSectionsCount, generationStartTime);
                if (result?.updated) {
                    this._lastUpdateTimeByMessage.set(aiMessageId, result.lastUpdateTime);
                    lastUpdateTime = result.lastUpdateTime;
                    leadingFlushed = true;
                }
            }

            // Debounce (trailing edge): schedule a final flush after inactivity
            const existingTimer = this._debounceTimersByMessage.get(aiMessageId);
            if (existingTimer) {
                try { clearTimeout(existingTimer); } catch (_) {}
            }
            const timer = setTimeout(async () => {
                try {
                    const pending = this._pendingArgsByMessage.get(aiMessageId);
                    if (pending) {
                        const res = await this._performStreamingUpdate(
                            aiMessageId,
                            pending.cleanContent,
                            pending.tokenCount,
                            pending.currentTPS,
                            pending.thinkingSectionsCount,
                            pending.generationStartTime
                        );
                        if (res?.updated) {
                            this._lastUpdateTimeByMessage.set(aiMessageId, res.lastUpdateTime);
                        }
                    }
                } catch (e) {
                    console.error('❌ Error in trailing debounce flush:', e);
                } finally {
                    this._debounceTimersByMessage.delete(aiMessageId);
                }
            }, interval);
            this._debounceTimersByMessage.set(aiMessageId, timer);

            return { updated: leadingFlushed, lastUpdateTime };
        } catch (error) {
            console.error("❌ Error updating message during streaming:", error);
            return { updated: false, lastUpdateTime: this._lastUpdateTimeByMessage.get(aiMessageId) || 0, error: error.message };
        }
    }

    /**
     * Persist a single thinking section immediately as it is detected
     */
    async saveThinkingSection(messageId, sectionId, content, startTime, endTime, thinkingTokensUsed = 0) {
        try {
            const thinkingEntity = require(`${master.root}/components/chats/app/models/thinking`);
            const thinking = new thinkingEntity();
            thinking.Messages = messageId;
            thinking.section_id = sectionId;
            thinking.content = content || '';
            thinking.start_time = parseInt(startTime);
            thinking.end_time = parseInt(endTime);
            thinking.thinking_tokens_used = parseInt(thinkingTokensUsed || 0);
            thinking.created_at = Date.now().toString();
            thinking.updated_at = Date.now().toString();

            this._chatContext.Thinking.add(thinking);
            await this._saveWithRetry();

            return { success: true, id: thinking.id };
        } catch (error) {
            console.error('❌ Error saving thinking section:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Persist incremental clean assistant content. Thin wrapper around updateAIMessageStreaming
     */
    async saveIncrementalAssistantContent(aiMessageId, cleanContent, tokenCount, currentTPS, thinkingSectionsCount, generationStartTime, lastUpdateTime) {
        return this.updateAIMessageStreaming(aiMessageId, cleanContent, tokenCount, currentTPS, thinkingSectionsCount, generationStartTime, lastUpdateTime);
    }

    /**
     * Flush any pending trailing debounce update so the database has the final full content
     */
    async flushPendingStreamingUpdate(aiMessageId) {
        try {
            // Clear any scheduled debounce timer
            const existingTimer = this._debounceTimersByMessage.get(aiMessageId);
            if (existingTimer) {
                try { clearTimeout(existingTimer); } catch (_) {}
                this._debounceTimersByMessage.delete(aiMessageId);
            }

            // Apply the latest pending args if present
            const pending = this._pendingArgsByMessage.get(aiMessageId);
            if (pending) {
                const res = await this._performStreamingUpdate(
                    aiMessageId,
                    pending.cleanContent,
                    pending.tokenCount,
                    pending.currentTPS,
                    pending.thinkingSectionsCount,
                    pending.generationStartTime
                );
                if (res?.updated) {
                    this._lastUpdateTimeByMessage.set(aiMessageId, res.lastUpdateTime);
                }
                this._pendingArgsByMessage.delete(aiMessageId);
            }
            return true;
        } catch (error) {
            console.error('❌ Error flushing pending streaming update:', error);
            return false;
        }
    }

    /**
     * Get message by ID
     */
    async getMessageById(messageId) {
        try {
            return this._chatContext.Messages
                .where(m => m.id == $$, messageId)
                .single();
        } catch (error) {
            console.error('Error getting message by ID:', error);
            throw error;
        }
    }

    /**
     * Delete assistant message if it has no meaningful content
     */
    async deleteAssistantMessageIfEmpty(messageId) {
        try {
            const msg = this._chatContext.Messages
                .where(m => m.id == $$, messageId)
                .single();
            if (!msg) return { deleted: false, reason: 'not_found' };
            const role = String(msg.role || '').toLowerCase();
            const content = typeof msg.content === 'string' ? msg.content.trim() : '';
            if (role === 'assistant' && content.length === 0) {
                this._chatContext.Messages.remove(msg);
                await this._saveWithRetry();
                return { deleted: true };
            }
            return { deleted: false, reason: 'not_empty' };
        } catch (error) {
            console.error('❌ Error deleting empty assistant message:', error);
            return { deleted: false, error: error.message };
        }
    }

    /**
     * Verify message exists
     */
    async verifyMessageExists(messageId) {
        try {
            const message = this._chatContext.Messages
                .where(m => m.id == $$, messageId)
                .single();
            return !!message;
        } catch (error) {
            console.error('Error verifying message exists:', error);
            return false;
        }
    }

    /**
     * Update message attachments (for AI-generated images)
     */
    async updateMessageAttachments(messageId, imageUrls) {
        try {
            const message = this._chatContext.Messages
                .where(m => m.id == $$, messageId)
                .single();

            if (!message) {
                throw new Error('Message not found');
            }

            // Parse existing attachments if any
            let existingAttachments = [];
            if (message.attachments) {
                try {
                    existingAttachments = typeof message.attachments === 'string'
                        ? JSON.parse(message.attachments)
                        : message.attachments;
                } catch (_) {
                    existingAttachments = [];
                }
            }

            // Merge with new image URLs
            const allAttachments = Array.isArray(existingAttachments)
                ? [...existingAttachments, ...imageUrls]
                : imageUrls;

            // Update message with attachments
            message.attachments = JSON.stringify(allAttachments);
            message.updated_at = Date.now().toString();

            await this._saveWithRetry();

            return { success: true, attachmentCount: allAttachments.length };
        } catch (error) {
            console.error('Error updating message attachments:', error);
            throw error;
        }
    }
}

module.exports = MessagePersistenceService;
