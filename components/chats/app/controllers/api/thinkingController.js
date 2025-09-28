const master = require('mastercontroller');
const thinkingEntity = require(`${master.root}/components/chats/app/models/thinking`);
const messagesEntity = require(`${master.root}/components/chats/app/models/messages`);

class thinkingController {

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;
    }

    /**
     * Save a thinking section to the database
     * POST /api/thinking/save
     */
    async createThinkingSection(obj) {
        try {
            if (obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const formData = obj.params.formData || obj.params;
            const { messageId, sectionId, content, startTime, endTime, thinkingTokensUsed } = formData;

            // Validate required fields (note: sectionId can be 0, so check for null/undefined specifically)
            if (!messageId || sectionId === null || sectionId === undefined || !content || !startTime || !endTime) {
                return this.returnJson({
                    success: false,
                    error: "Missing required fields: messageId, sectionId, content, startTime, endTime"
                });
            }


            // Create new thinking section
            const thinking = new thinkingEntity();
            thinking.Messages = messageId;
            thinking.section_id = sectionId;
            thinking.content = content;
            thinking.start_time = parseInt(startTime);
            thinking.end_time = parseInt(endTime);
            thinking.thinking_tokens_used = parseInt(thinkingTokensUsed || 0);
            thinking.created_at = Date.now().toString();
            thinking.updated_at = Date.now().toString();

            this._chatContext.Thinking.add(thinking);
            this._chatContext.saveChanges();

    
            return this.returnJson({
                success: true,
                thinking: {
                    id: thinking.id,
                    messageId: thinking.messages_id,
                    sectionId: thinking.section_id,
                    content: thinking.content,
                    startTime: thinking.start_time,
                    endTime: thinking.end_time,
                    duration: thinking.end_time - thinking.start_time,
                    thinkingTokensUsed: thinking.thinking_tokens_used,
                    createdAt: thinking.created_at
                }
            });

        } catch (error) {
            console.error("Error saving thinking section:", error);
            return this.returnJson({
                success: false,
                error: "Failed to save thinking section",
                details: error.message
            });
        }
    }

    /**
     * Get all thinking sections for a message
     * GET /api/thinking/get/:messageId
     */
    async getThinkingSections(obj) {
        try {
            if (obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const messageId = obj.params.messageId;

            if (!messageId) {
                return this.returnJson({
                    success: false,
                    error: "Message ID is required"
                });
            }

            // Verify the message exists and belongs to the current user
            const message = this._chatContext.Messages
                .where(m => m.id == $$, messageId)
                .single();

            if (!message) {
                return this.returnJson({
                    success: false,
                    error: "Message not found"
                });
            }

            // Get all thinking sections for this message
            const thinkingSections = this._chatContext.Thinking
                .where(t => t.messages_id == $$, messageId)
                .orderBy(t => t.section_id)
                .toList();

            const formattedSections = thinkingSections.map(thinking => ({
                id: thinking.id,
                messageId: thinking.messages_id,
                sectionId: thinking.section_id,
                content: thinking.content,
                startTime: thinking.start_time,
                endTime: thinking.end_time,
                duration: thinking.end_time - thinking.start_time,
                durationSeconds: Math.ceil((thinking.end_time - thinking.start_time) / 1000),
                thinkingTokensUsed: thinking.thinking_tokens_used,
                createdAt: thinking.created_at
            }));

            return this.returnJson({
                success: true,
                messageId: parseInt(messageId),
                thinkingSections: formattedSections
            });

        } catch (error) {
            console.error("Error getting thinking sections:", error);
            return this.returnJson({
                success: false,
                error: "Failed to get thinking sections",
                details: error.message
            });
        }
    }

    /**
     * Get thinking sections for all messages in a chat
     * GET /api/thinking/chat/:chatId
     */
    async getThinkingSectionsForChat(obj) {
        try {
            if (obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const chatId = obj.params.chatId;

            if (!chatId) {
                return this.returnJson({
                    success: false,
                    error: "Chat ID is required"
                });
            }

            // Get all messages for this chat
            const messages = this._chatContext.Messages
                .where(m => m.chat_id == $$, chatId)
                .select(m => m.id)
                .toList();

            const messageIds = messages.map(m => m.id);

            if (messageIds.length === 0) {
                return this.returnJson({
                    success: true,
                    chatId: parseInt(chatId),
                    thinkingSections: {}
                });
            }

            // Get all thinking sections for these messages
            const thinkingSections = this._chatContext.Thinking
                .where(t => messageIds.includes(t.messages_id))
                .orderBy(t => t.messages_id)
                .thenBy(t => t.section_id)
                .toList();

            // Group thinking sections by message ID
            const groupedSections = {};
            thinkingSections.forEach(thinking => {
                if (!groupedSections[thinking.messages_id]) {
                    groupedSections[thinking.messages_id] = [];
                }
                
                groupedSections[thinking.messages_id].push({
                    id: thinking.id,
                    messageId: thinking.messages_id,
                    sectionId: thinking.section_id,
                    content: thinking.content,
                    startTime: thinking.start_time,
                    endTime: thinking.end_time,
                    duration: thinking.end_time - thinking.start_time,
                    durationSeconds: Math.ceil((thinking.end_time - thinking.start_time) / 1000),
                    thinkingTokensUsed: thinking.thinking_tokens_used,
                    createdAt: thinking.created_at
                });
            });

            return this.returnJson({
                success: true,
                chatId: parseInt(chatId),
                thinkingSections: groupedSections
            });

        } catch (error) {
            console.error("Error getting thinking sections for chat:", error);
            return this.returnJson({
                success: false,
                error: "Failed to get thinking sections for chat",
                details: error.message
            });
        }
    }

    /**
     * Update a thinking section
     * PUT /api/thinking/update/:thinkingId
     */
    async updateThinkingSection(obj) {
        try {
            if (obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const thinkingId = obj.params.thinkingId;
            const formData = obj.params.formData || obj.params;

            if (!thinkingId) {
                return this.returnJson({
                    success: false,
                    error: "Thinking ID is required"
                });
            }

            // Find the thinking section
            const thinking = this._chatContext.Thinking
                .where(t => t.id == $$, thinkingId)
                .single();

            if (!thinking) {
                return this.returnJson({
                    success: false,
                    error: "Thinking section not found"
                });
            }

            // Update allowed fields
            if (formData.content !== undefined) {
                thinking.content = formData.content;
            }
            if (formData.endTime !== undefined) {
                thinking.end_time = parseInt(formData.endTime);
            }
            if (formData.thinkingTokensUsed !== undefined) {
                thinking.thinking_tokens_used = parseInt(formData.thinkingTokensUsed);
            }

            thinking.updated_at = Date.now().toString();

            this._chatContext.saveChanges();

            return this.returnJson({
                success: true,
                thinking: {
                    id: thinking.id,
                    messageId: thinking.messages_id,
                    sectionId: thinking.section_id,
                    content: thinking.content,
                    startTime: thinking.start_time,
                    endTime: thinking.end_time,
                    duration: thinking.end_time - thinking.start_time,
                    durationSeconds: Math.ceil((thinking.end_time - thinking.start_time) / 1000),
                    thinkingTokensUsed: thinking.thinking_tokens_used,
                    updatedAt: thinking.updated_at
                }
            });

        } catch (error) {
            console.error("Error updating thinking section:", error);
            return this.returnJson({
                success: false,
                error: "Failed to update thinking section",
                details: error.message
            });
        }
    }

    returnJson(obj) {
        return obj;
    }
}

module.exports = thinkingController;
