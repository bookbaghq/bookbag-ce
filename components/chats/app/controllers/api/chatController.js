const master = require('mastercontroller');
const crypto = require('crypto');
const chatEntity = require(`${master.root}/components/chats/app/models/chat`);
const userChatEntity = require(`${master.root}/components/chats/app/models/userchat`);

class chatController {

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;
        this._workspaceContext = req.workspaceContext;
        // Admin-only actions moved to adminChatController
    }

    // API endpoint to edit chat title
    async editChat(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const chatId = parseInt(f.chatId || f.chat_id || f.id, 10);
            const titleRaw = (typeof f.title === 'string') ? f.title : (typeof f.name === 'string' ? f.name : '');
            const newTitle = String(titleRaw || '').trim();

            if (!chatId) {
                return this.returnJson({ success: false, error: "Chat ID is required" });
            }
            if (!newTitle) {
                return this.returnJson({ success: false, error: "Title is required" });
            }

            const chat = this._chatContext.Chat
                .where(c => c.id == $$, chatId)
                .single();
            if (!chat) {
                return this.returnJson({ success: false, error: "Chat not found or access denied" });
            }

            // Membership check (direct or via workspace)
            if (!this._isCurrentUserMemberOfChat(chat)) {
                if (!this._isUserMemberOfChatWorkspace(chat.id)) {
                    return this.returnJson({ success: false, error: "Chat not found or access denied" });
                }
            }

            chat.title = newTitle;
            chat.updated_at = Date.now().toString();
            this._chatContext.saveChanges();

            return this.returnJson({ success: true, chat: { id: chat.id, title: chat.title } });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    // API endpoint to get admin-created chats for the current user (top 50)
    async getAdminCreatedChats(obj) {
        try {
            const memberships = this._chatContext.UserChat
                .where(uc => uc.user_id == $$, this._currentUser.id)
                .orderByDescending(uc => uc.updated_at)
                .toList();

            const adminChats = [];
            for (const m of memberships) {
                try {
                    const chat = this._chatContext.Chat
                        .where(c => c.id == $$ && c.is_archived == $$ && c.is_deleted == $$, m.chat_id, 0, 0)
                        .single();
                    if (chat && (chat.is_admin_created === true || chat.is_admin_created === 1)) {
                        adminChats.push(chat);
                    }
                } catch (_) { /* ignore per-chat errors */ }
            }

            const sorted = adminChats.sort((a, b) => parseInt(b.updated_at) - parseInt(a.updated_at)).slice(0, 50);
            const chatData = await this.formatChatList(sorted);
            return this.returnJson({ success: true, chats: chatData, totalChats: adminChats.length });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }
    
    // Helper: check if current user is a member of the chat via Chat.Users (hasManyThrough UserChat)
    _isCurrentUserMemberOfChat(chat) {
        try {
            const users = chat && Array.isArray(chat.Users) ? chat.Users : [];
            const currentId = String(this._currentUser?.id);
            for (let i = 0; i < users.length; i++) {
                const u = users[i] || {};
                const candidate = (u.user_id != null && u.user_id !== undefined) ? u.user_id : u.id;
                if (String(candidate) === currentId) {
                    return true;
                }
            }
            return false;
        } catch (_) {
            return false;
        }
    }

    // Helper: check if current user is a member of any workspace that contains this chat
    _isUserMemberOfChatWorkspace(chatId) {
        try {
            if (!this._workspaceContext) return false;
            const links = this._workspaceContext.WorkspaceChat
                .where(r => r.chat_id == $$, chatId)
                .toList();
            for (const l of links) {
                try {
                    const members = this._workspaceContext.WorkspaceUser
                        .where(r => r.workspace_id == $$ && r.user_id == $$, l.workspace_id, this._currentUser.id)
                        .toList();
                    if (Array.isArray(members) && members.length > 0) return true;
                } catch (_) { /* ignore */ }
            }
            return false;
        } catch (_) {
            return false;
        }
    }

    // API endpoint to get recent chats (today)
    async getRecentChats(obj) {
        try {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const startOfToday = now - oneDayMs;

            // Membership-first: get chats for current user updated today
            const memberships = this._chatContext.UserChat
                .where(uc => uc.user_id == $$, this._currentUser.id)
                .orderByDescending(uc => uc.updated_at)
                .toList();

            const recentChats = [];
	            for (const m of memberships) {
	                try {
	                    const chat = this._chatContext.Chat
	                        .where(c => c.id == $$ && c.updated_at >= $$ && c.is_archived == $$ && c.is_deleted == $$, m.chat_id, startOfToday.toString(), 0, 0)
	                        .single();
	                    if (chat) {
	                        recentChats.push(chat);
	                    }
	                } catch (_) { /* ignore per-chat errors */ }
	            }

            recentChats.sort((a, b) => parseInt(b.updated_at) - parseInt(a.updated_at));
            recentChats.splice(20);

            console.log(`Found ${recentChats.length} recent chats for user ${this._currentUser.id}`);

            const chatData = await this.formatChatList(recentChats);

            return this.returnJson({
                success: true,
                chats: chatData,
                totalChats: recentChats.length,
                period: 'recent'
            });
        } catch (error) {
            console.error("Error fetching recent chats:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    // API endpoint to get yesterday's chats
    async getYesterdayChats(obj) {
        try {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const startOfYesterday = now - (2 * oneDayMs);
            const endOfYesterday = now - oneDayMs;

            const memberships = this._chatContext.UserChat
                .where(uc => uc.user_id == $$, this._currentUser.id)
                .orderByDescending(uc => uc.updated_at)
                .toList();

            const yesterdayChats = [];
	            for (const m of memberships) {
	                try {
	                    const chat = this._chatContext.Chat
	                        .where(c => c.id == $$ && c.updated_at >= $$ && c.updated_at < $$ && c.is_archived == $$ && c.is_deleted == $$, m.chat_id, startOfYesterday.toString(), endOfYesterday.toString(), 0, 0)
	                        .single();
	                    if (chat) {
	                        yesterdayChats.push(chat);
	                    }
	                } catch (_) { /* ignore per-chat errors */ }
	            }

            yesterdayChats.sort((a, b) => parseInt(b.updated_at) - parseInt(a.updated_at));
            yesterdayChats.splice(20);

            console.log(`Found ${yesterdayChats.length} yesterday chats for user ${this._currentUser.id}`);

            const chatData = await this.formatChatList(yesterdayChats);

            return this.returnJson({
                success: true,
                chats: chatData,
                totalChats: yesterdayChats.length,
                period: 'yesterday'
            });
        } catch (error) {
            console.error("Error fetching yesterday chats:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    // API endpoint to get chats from previous 7 days
    async getSevenDayChats(obj) {
        try {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const oneWeekMs = 7 * oneDayMs;
            const startOfWeek = now - oneWeekMs;
            const startOfYesterday = now - (2 * oneDayMs);

            const memberships = this._chatContext.UserChat
                .where(uc => uc.user_id == $$, this._currentUser.id)
                .orderByDescending(uc => uc.updated_at)
                .toList();

            const weekChats = [];
	            for (const m of memberships) {
	                try {
	                    const chat = this._chatContext.Chat
	                        .where(c => c.id == $$ && c.updated_at >= $$ && c.updated_at < $$ && c.is_archived == $$ && c.is_deleted == $$, m.chat_id, startOfWeek.toString(), startOfYesterday.toString(), 0, 0)
	                        .single();
	                    if (chat) {
	                        weekChats.push(chat);
	                    }
	                } catch (_) { /* ignore per-chat errors */ }
	            }

            weekChats.sort((a, b) => parseInt(b.updated_at) - parseInt(a.updated_at));
            weekChats.splice(30);

            console.log(`Found ${weekChats.length} chats from previous 7 days for user ${this._currentUser.id}`);

            const chatData = await this.formatChatList(weekChats);

            return this.returnJson({
                success: true,
                chats: chatData,
                totalChats: weekChats.length,
                period: 'previousWeek'
            });
        } catch (error) {
            console.error("Error fetching 7-day chats:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    // API endpoint to get all chats for a user
    async getAllChats(obj) {
        try {
            const page = parseInt(obj.params.page) || 1;
            const limit = parseInt(obj.params.limit) || 50;
            const offset = (page - 1) * limit;

            // Membership-first: query UserChat for this user, then load chats by ids
            const memberships = this._chatContext.UserChat
                .where(uc => uc.user_id == $$, this._currentUser.id)
                .orderByDescending(uc => uc.updated_at)
                .toList();

            const chatsForUser = [];
	            for (const m of memberships) {
	                try {
	                    const chat = this._chatContext.Chat
	                        .where(c => c.id == $$ && c.is_archived == $$ && c.is_deleted == $$, m.chat_id, 0, 0)
	                        .single();
	                    if (chat && !(chat.is_admin_created === true || chat.is_admin_created === 1)) {
	                        chatsForUser.push(chat);
	                    }
	                } catch (_) { /* ignore per-chat errors */ }
	            }

            const sortedChats = chatsForUser
                .sort((a, b) => parseInt(b.updated_at) - parseInt(a.updated_at));

            const pagedChats = sortedChats.slice(offset, offset + limit);

            const chatData = await this.formatChatList(pagedChats);

            return this.returnJson({
                success: true,
                chats: chatData,
                totalChats: sortedChats.length,
                page: page,
                limit: limit,
                period: 'all'
            });
        } catch (error) {
            console.error("Error fetching all chats:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    // Helper method to format chat list
    async formatChatList(chats) {
        const formattedChats = [];

        for (const chat of chats) {
            try {
                formattedChats.push({
                    id: chat.id,
                    title: chat.title || 'Untitled Chat',
                    timestamp: this.formatChatTimestamp(parseInt(chat.updated_at)),
                    description: await this.extractChatDescription(chat),
                    updated_at: parseInt(chat.updated_at),
                    created_at: parseInt(chat.created_at),
                    session_id: chat.session_id,
                    total_token_count: chat.total_token_count || 0
                });
            } catch (error) {
                console.warn(`Error formatting chat ${chat.id}:`, error);
                // Include basic info even if description fails
                formattedChats.push({
                    id: chat.id,
                    title: chat.title || 'Untitled Chat',
                    timestamp: this.formatChatTimestamp(parseInt(chat.updated_at)),
                    description: "Error loading description",
                    updated_at: parseInt(chat.updated_at)
                });
            }
        }

        return formattedChats;
    }

    // Helper method to format timestamps
    formatChatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (hours < 1) {
            return "Just now";
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days === 1) {
            return "Yesterday";
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            const date = new Date(timestamp);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    // Helper method to extract chat description from first message
    async extractChatDescription(chat) {
        try {
            const firstMessage = chat.Messages[0]; // Use integer value for user role

            if (firstMessage && firstMessage.content) {
                const content = firstMessage.content;
                return content.length > 100 ? content.substring(0, 100) + "..." : content;
            }
        } catch (error) {
            console.warn("Error extracting chat description:", error);
        }

        return "No messages yet";
    }

    // API endpoint to search chats
    async searchChats(obj) {
        try {
            const query = obj.params.query.q || obj.body.query || '';
            const limit = parseInt(obj.params.limit) || 20;
            
            if (!query || query.trim().length < 2) {
                return this.returnJson({
                    success: false,
                    error: "Search query must be at least 2 characters long"
                });
            }

            const searchTerm = query.trim().toLowerCase();
            console.log(`Searching chats for user ${this._currentUser.id} with query: "${searchTerm}"`);

            // Search in chat titles and first message content (exclude archived)
            // Membership-first: fold search across user's chats only
            const memberships = this._chatContext.UserChat
                .where(uc => uc.user_id == $$, this._currentUser.id)
                .orderByDescending(uc => uc.updated_at)
                .toList();

            const candidateChats = [];
	            for (const m of memberships) {
	                try {
	                    const chat = this._chatContext.Chat
	                        .where(c => c.id == $$ && c.is_archived == $$ && c.is_deleted == $$ , m.chat_id, 0, 0)
	                        .single();
	                    if (chat) candidateChats.push(chat);
	                } catch (_) { /* ignore */ }
	            }

            const matchingChats = candidateChats
                .sort((a, b) => parseInt(b.updated_at) - parseInt(a.updated_at))
                .filter(chat => {
                    // Search in title
                    if (chat.title && chat.title.toLowerCase().includes(searchTerm)) {
                        return true;
                    }
                    
                    // Search in first message content
                    if (chat.Messages && chat.Messages.length > 0) {
                        const firstMessage = chat.Messages[0];
                        if (firstMessage.content && firstMessage.content.toLowerCase().includes(searchTerm)) {
                            return true;
                        }
                    }
                    
                    return false;
                })
                .slice(0, limit);

            

            const chatData = await this.formatChatList(matchingChats);

            // Group results by time periods for better organization
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const oneWeekMs = 7 * oneDayMs;
            const oneMonthMs = 30 * oneDayMs;

            const groupedResults = {
                recent: [],      // Last 24 hours
                thisWeek: [],    // Last 7 days
                thisMonth: [],   // Last 30 days
                older: []        // Older than 30 days
            };

            chatData.forEach(chat => {
                const timeDiff = now - chat.updated_at;
                
                if (timeDiff < oneDayMs) {
                    groupedResults.recent.push(chat);
                } else if (timeDiff < oneWeekMs) {
                    groupedResults.thisWeek.push(chat);
                } else if (timeDiff < oneMonthMs) {
                    groupedResults.thisMonth.push(chat);
                } else {
                    groupedResults.older.push(chat);
                }
            });

            return this.returnJson({
                success: true,
                query: query,
                results: chatData,
                groupedResults: groupedResults,
                totalResults: chatData.length
            });
        } catch (error) {
            console.error("Error searching chats:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    // API endpoint to get a specific chat by ID
    async getChatById(obj) {
        try {
            const chatId = obj.params.chatid;

            if (!chatId) {
                return this.returnJson({
                    success: false,
                    error: "Chat ID is required"
                });
            }

	            const chat = this._chatContext.Chat
	                .where(c => c.id == $$ && c.is_archived == $$ && c.is_deleted == $$, chatId, 0, 0)
	                .single();

            if (!chat) {
                return this.returnJson({
                    success: false,
                    error: "Chat not found or access denied"
                });
            }

            // Ensure membership via direct chat membership OR workspace membership
            if (!this._isCurrentUserMemberOfChat(chat)) {
                if (!this._isUserMemberOfChatWorkspace(chat.id)) {
                return this.returnJson({ success: false, error: "Chat not found or access denied" });
                }
            }

            // Get messages for this chat
            const messages = chat.Messages;

            // ✅ Format messages with clean content and load thinking sections via ORM relationships
            const formattedMessages = await Promise.all(messages.map(async (msg) => {
                const messageData = {
                    id: msg.id,
                    role: msg.role ? msg.role.toLowerCase() : 'user',
                    content: msg.content, // This should contain clean content (no thinking tags)
                    token_count: msg.token_count || 0,
                    max_tokens: msg.max_tokens || null,
                    tokens_per_seconds: msg.tokens_per_seconds || null,
                    generation_time_ms: msg.generation_time_ms || null,
                    start_time: msg.start_time || null,
                    end_time: msg.end_time || null,
                    model_id: msg.model_id || null,
                    createdAt: parseInt(msg.created_at),
                    updated_at: parseInt(msg.updated_at),
                    meta: msg.meta ? JSON.parse(msg.meta) : null
                };

                // Ensure meta exists
                if (!messageData.meta) {
                    messageData.meta = {};
                }

                // If model name is missing but we have a numeric model_id, derive it from config
                try {
                    if (!messageData.meta.model && messageData.model_id != null) {
                        const llmConfig = require(`${master.root}/components/models/app/service/llmConfigService`);
                        const cfg = await llmConfig.getModelConfig(String(messageData.model_id));
                        if (cfg && cfg.name) {
                            messageData.meta.model = cfg.name;
                            messageData.meta.modelId = cfg.id;
                        }
                    }
                } catch (_) {
                    // best-effort; ignore mapping errors
                }

                // Load thinking sections for this message and sort by end time ascending
                try {
                    const thinkingSections = this._chatContext.Thinking
                        .where(t => t.messages_id == $$, msg.id)
                        .orderBy(t => t.end_time)
                        .toList();

                    messageData.thinkingSections = (thinkingSections || []).map(thinking => ({
                        id: thinking.id,
                        messageId: thinking.messages_id,
                        sectionId: thinking.section_id,
                        content: thinking.content,
                        startTime: thinking.start_time,
                        endTime: thinking.end_time,
                        duration: (thinking.end_time - thinking.start_time),
                        durationSeconds: Math.ceil((thinking.end_time - thinking.start_time) / 1000),
                        thinkingTokensUsed: thinking.thinking_tokens_used,
                        createdAt: thinking.created_at
                    }));
                } catch (e) {
                    messageData.thinkingSections = [];
                }

                return messageData;
            }));

            // Calculate total thinking sections from all messages
            const totalThinkingSections = formattedMessages.reduce((total, msg) => {
                return total + (msg.thinkingSections ? msg.thinkingSections.length : 0);
            }, 0);

            const chatData = {
                id: chat.id,
                title: chat.title || 'Untitled Chat',
                is_workplace_created: (chat.is_workplace_created === true || chat.is_workplace_created === 1),
                session_id: chat.session_id,
                total_token_count: chat.total_token_count || 0,
                created_at: parseInt(chat.created_at),
                updated_at: parseInt(chat.updated_at),
                messages: formattedMessages,
                totalThinkingSections: totalThinkingSections
            };

            console.log(`✅ Chat ${chatId} loaded with ${formattedMessages.length} messages and ${totalThinkingSections} thinking sections`);

            return this.returnJson({
                success: true,
                chat: chatData
            });
        } catch (error) {
            console.error("Error fetching chat by ID:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    // API endpoint to archive a specific chat by ID
    async archiveChat(obj) {
        try {
            const chatId = obj.params.chatid;

            if (!chatId) {
                return this.returnJson({
                    success: false,
                    error: "Chat ID is required"
                });
            }

            // Verify that the chat exists and belongs to the current user
            const chat = this._chatContext.Chat
                .where(c => c.id == $$, chatId)
                .single();

            if (!chat) {
                return this.returnJson({
                    success: false,
                    error: "Chat not found or access denied"
                });
            }

            // Membership check (direct or via workspace)
            if (!this._isCurrentUserMemberOfChat(chat)) {
                if (!this._isUserMemberOfChatWorkspace(chat.id)) {
                    return this.returnJson({ success: false, error: "Chat not found or access denied" });
                }
            }

            // Update the chat record to set archived flag to true
            chat.is_archived = true;
            chat.archived_at = Date.now().toString();
            this._chatContext.saveChanges();

            return this.returnJson({
                success: true,
                message: "Chat archived successfully"
            });
        } catch (error) {
            console.error("Error archiving chat:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    // API endpoint to delete a specific chat by ID
    async deleteChat(obj) {
        try {
            const chatId = obj.params.chatid;

            if (!chatId) {
                return this.returnJson({
                    success: false,
                    error: "Chat ID is required"
                });
            }

            // Verify that the chat exists and belongs to the current user
            const chat = this._chatContext.Chat
                .where(c => c.id == $$, chatId)
                .single();

            if (!chat) {
                return this.returnJson({
                    success: false,
                    error: "Chat not found or access denied"
                });
            }

            // Membership check (direct or via workspace)
            if (!this._isCurrentUserMemberOfChat(chat)) {
                if (!this._isUserMemberOfChatWorkspace(chat.id)) {
                    return this.returnJson({ success: false, error: "Chat not found or access denied" });
                }
            }

            chat.is_deleted = true;
            chat.deleted_at = Date.now().toString();
            this._chatContext.saveChanges();

            return this.returnJson({
                success: true,
                message: "Chat deleted successfully"
            });
        } catch (error) {
            console.error("Error deleting chat:", error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    returnJson(obj) {
        return obj;
    }
}

module.exports = chatController;
