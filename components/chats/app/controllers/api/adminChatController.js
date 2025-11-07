const master = require('mastercontroller');
const crypto = require('crypto');
const chatEntity = require(`${master.root}/components/chats/app/models/chat`);
const userChatEntity = require(`${master.root}/components/chats/app/models/userchat`);

class adminChatController {

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;
        // All actions here require admin
        this.beforeAction(["adminSearchChats", "adminGetChatById", "createChat", "adminDeleteChat"], req.authService.validateIsAdmin);
    }

    // ADMIN: search chats across users, filter by user ids
    async adminSearchChats(obj) {
        try {
            const qParam = (obj.params?.query?.q || obj.body?.query || "").trim().toLowerCase();
            const limit = parseInt(obj.params?.limit) || 50;

            // Parse user filters: support `userIds` (comma-separated) or repeated params
            let userIds = [];
            const rawUserIds = obj.params?.query?.userIds || obj.params?.query?.users;
            if (rawUserIds) {
                if (Array.isArray(rawUserIds)) {
                    userIds = rawUserIds.map(x => String(x));
                } else if (typeof rawUserIds === 'string') {
                    userIds = rawUserIds.split(',').map(x => x.trim()).filter(Boolean);
                }
            }

            // Build limited chat set directly from DB based on user filters
            let chatQuery = [];
            if (userIds.length > 0) {
                chatQuery = this._chatContext.Chat
                    .where(c => c.is_archived == $$ && c.is_deleted == $$, 0, 0)
                    .orderByDescending(c => c.updated_at)
                    .take(limit * 5)
                    .toList()
                    .filter(chat => {
                        try {
                            const users = chat.Users || [];
                            return users.some(u => userIds.includes(String(u.user_id)) || userIds.includes(String(u.id)));
                        } catch (_) { return false; }
                    })
                    .slice(0, limit);
            } else {
                chatQuery = this._chatContext.Chat
                    .where(c => c.is_archived == $$ && c.is_deleted == $$, 0, 0)
                    .orderByDescending(c => c.updated_at)
                    .take(limit)
                    .toList();
            }

            // Text search in title or first message
            let filteredChats = chatQuery;
            if (qParam && qParam.length >= 1) {
                filteredChats = chatQuery.filter(chat => {
                    if (chat.title && String(chat.title).toLowerCase().includes(qParam)) return true;
                    try {
                        if (chat.Messages && chat.Messages.length > 0) {
                            const firstMessage = chat.Messages[0];
                            return (firstMessage.content || '').toLowerCase().includes(qParam);
                        }
                    } catch (_) { /* ignore */ }
                    return false;
                });
            }

            // Sort again and enforce global limit
            filteredChats = filteredChats
                .sort((a, b) => parseInt(b.updated_at) - parseInt(a.updated_at))
                .slice(0, limit);

            // Build owner cache to avoid repeated lookups
            const owners = {};
            for (const chat of filteredChats) {
                try {
                    const users = chat.Users || [];
                    const ownerId = users[0]?.user_id || users[0]?.id;
                    if (ownerId && !owners[String(ownerId)]) {
                        const u = obj.userContext.User.where(r => r.id == $$, ownerId).single();
                        if (u) {
                            owners[String(ownerId)] = {
                                id: u.id,
                                firstName: u.first_name,
                                lastName: u.last_name,
                                userName: u.user_name,
                                email: u.email,
                                role: u.role
                            };
                        }
                    }
                } catch (_) { /* ignore */ }
            }

            const results = filteredChats.map(chat => {
                const users = chat.Users || [];
                const ownerId = users[0]?.user_id || users[0]?.id;
                return {
                    id: chat.id,
                    title: chat.title || 'Untitled Chat',
                    owner: ownerId ? (owners[String(ownerId)] || { id: ownerId }) : null,
                    messageCount: (chat.Messages || []).length,
                    created_at: parseInt(chat.created_at),
                    updated_at: parseInt(chat.updated_at),
                    session_id: chat.session_id,
                    total_token_count: chat.total_token_count || 0
                }
            });

            return this.returnJson({
                success: true,
                query: qParam,
                filters: { userIds },
                results,
                totalResults: results.length
            });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    // ADMIN: get chat by id (with messages), regardless of owner
    async adminGetChatById(obj) {
        try {
            const chatId = obj.params?.chatid || obj.params?.chatId || obj.params?.id;
            if (!chatId) {
                return this.returnJson({ success: false, error: "Chat ID is required" });
            }

            const chat = this._chatContext.Chat.where(c => c.id == $$, chatId).single();
            if (!chat) {
                return this.returnJson({ success: false, error: "Chat not found" });
            }

            // Owner details
            let owner = null;
            try {
                const users = chat.Users || [];
                const ownerId = users[0]?.user_id || users[0]?.id;
                if (ownerId) {
                    const u = obj.userContext.User.where(r => r.id == $$, ownerId).single();
                    if (u) {
                        owner = {
                            id: u.id,
                            firstName: u.first_name,
                            lastName: u.last_name,
                            userName: u.user_name,
                            email: u.email,
                            role: u.role
                        };
                    }
                }
            } catch (_) { /* ignore */ }

            const messages = chat.Messages || [];
            const formattedMessages = messages.map((msg) => ({
                id: msg.id,
                role: msg.role ? msg.role.toLowerCase() : 'user',
                content: msg.content,
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
            }));

            const chatData = {
                id: chat.id,
                title: chat.title || 'Untitled Chat',
                owner,
                session_id: chat.session_id,
                total_token_count: chat.total_token_count || 0,
                created_at: parseInt(chat.created_at),
                updated_at: parseInt(chat.updated_at),
                messages: formattedMessages
            };

            return this.returnJson({ success: true, chat: chatData });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    // ADMIN: create a chat with users
    async createChat(obj) {
        try {
            const formData = obj.params?.formData || obj.params || obj.body || {};
            const rawTitle = formData.title;
            const userIdsRaw = formData.userIds || formData.users || [];

            const title = (typeof rawTitle === 'string' ? rawTitle.trim() : String(rawTitle || '')).slice(0, 200);
            if (!title) {
                return this.returnJson({ success: false, error: 'Title is required' });
            }

            const userIds = Array.isArray(userIdsRaw) ? userIdsRaw : [userIdsRaw];
            const normalizedUserIds = Array.from(new Set(userIds.map(x => parseInt(String(x), 10)).filter(n => Number.isFinite(n) && n > 0)));
            if (normalizedUserIds.length === 0) {
                return this.returnJson({ success: false, error: 'At least one user must be selected' });
            }

            const timestamp = Date.now().toString();

            const chat = new chatEntity();
            chat.created_at = timestamp;
            chat.updated_at = timestamp;
            chat.session_id = crypto.randomBytes(16).toString('hex');
            chat.total_token_count = 0;
            chat.title = title;
            chat.created_by = 'Admin';

            this._chatContext.Chat.add(chat);
            this._chatContext.saveChanges();

            for (const uid of normalizedUserIds) {
                try {
                    const userChat = new userChatEntity();
                    userChat.Chat = chat.id;
                    userChat.user_id = String(uid);
                    userChat.created_at = timestamp;
                    userChat.updated_at = timestamp;
                    this._chatContext.UserChat.add(userChat);
                } catch (_) { /* ignore individual failures */ }
            }
            this._chatContext.saveChanges();

            return this.returnJson({ success: true, chatId: chat.id });
        } catch (error) {
            return this.returnJson({ success: false, error: error?.message || 'Failed to create chat' });
        }
    }

    // ADMIN: delete chat by id (no membership required)
    async adminDeleteChat(obj) {
        try {
            const chatId = obj.params?.chatid || obj.params?.chatId || obj.params?.id;
            if (!chatId) {
                return this.returnJson({ success: false, error: "Chat ID is required" });
            }

            const chat = this._chatContext.Chat.where(c => c.id == $$, chatId).single();
            if (!chat) {
                return this.returnJson({ success: false, error: "Chat not found" });
            }

            chat.is_deleted = true;
            chat.deleted_at = Date.now().toString();
            this._chatContext.saveChanges();

            return this.returnJson({ success: true, message: "Chat deleted successfully" });
        } catch (error) {
            return this.returnJson({ success: false, error: error?.message || 'Failed to delete chat' });
        }
    }

    returnJson(obj) { return obj; }
}

module.exports = adminChatController;


