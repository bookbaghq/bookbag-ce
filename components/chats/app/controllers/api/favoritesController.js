const master = require('mastercontroller');

class favoritesController {

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;
    }

    // Get all favorite chats for current user using UserChat.is_favorite
    async getFavorites(obj) {
        try {
            // Get all favorite memberships for this user
            const memberships = this._chatContext.UserChat
                .where(uc => uc.user_id == $$ && (uc.is_favorite == $$ || uc.is_favorite == $$), this._currentUser.id, 1, true)
                .orderByDescending(uc => uc.updated_at)
                .toList();

            const favoriteChats = [];
            for (const m of memberships) {
                try {
                    const chat = this._chatContext.Chat
                        .where(c => c.id == $$ && c.is_archived == $$ && c.is_deleted == $$, m.chat_id, 0, 0)
                        .single();
                    if (chat && chat.created_by !== 'Admin') {
                        favoriteChats.push(chat);
                    }
                } catch (_) { /* ignore per-chat errors */ }
            }

            favoriteChats.sort((a, b) => parseInt(b.updated_at) - parseInt(a.updated_at));
            const chatData = await this.formatChatList(favoriteChats);

            return this.returnJson({
                success: true,
                chats: chatData,
                totalChats: favoriteChats.length,
                period: 'favorites'
            });
        } catch (error) {
            return this.returnJson({ success: false, error: error?.message || 'Failed to get favorites' });
        }
    }

    // Reuse formatter from chat controller by simple inline fallback
    async formatChatList(chats) {
        const formatted = [];
        for (const chat of chats) {
            try {
                formatted.push({
                    id: chat.id,
                    title: chat.title || 'Untitled Chat',
                    timestamp: parseInt(chat.updated_at),
                    updated_at: parseInt(chat.updated_at),
                    created_at: parseInt(chat.created_at),
                    session_id: chat.session_id,
                    total_token_count: chat.total_token_count || 0
                });
            } catch (_) {
                formatted.push({ id: chat.id, title: chat.title || 'Untitled Chat' });
            }
        }
        return formatted;
    }
    // Toggle or set favorite for current user on a chat
    async toggle(obj) {
        try {
            const body = obj.params?.formData || obj.params || obj.body || {};
            const chatId = body.chatId || body.chat_id || obj.params?.chatid || obj.params?.chatId;
            const favorite = body.favorite;

            if (!chatId) {
                return this.returnJson({ success: false, error: 'Chat ID is required' });
            }

            // Ensure chat exists
            const chat = this._chatContext.Chat.where(c => c.id == $$, chatId).single();
            if (!chat) {
                return this.returnJson({ success: false, error: 'Chat not found' });
            }

            // Find or create membership
            let userChat = this._chatContext.UserChat
                .where(uc => uc.chat_id == $$ && uc.user_id == $$, chatId, this._currentUser.id)
                .single();

            const now = Date.now().toString();
            if (!userChat) {
                const userChatEntity = require(`${master.root}/components/chats/app/models/userchat`);
                userChat = new userChatEntity();
                userChat.Chat = chat.id;
                userChat.user_id = this._currentUser.id;
                userChat.created_at = now;
                userChat.updated_at = now;
                // default favorite to requested state
                userChat.is_favorite = favorite ? 1 : 0;
                this._chatContext.UserChat.add(userChat);
            } else {
                userChat.is_favorite = favorite ? 1 : 0;
                userChat.updated_at = now;
            }

            this._chatContext.saveChanges();
            return this.returnJson({ success: true, chatId: chat.id, is_favorite: userChat.is_favorite == 1 });
        } catch (error) {
            return this.returnJson({ success: false, error: error?.message || 'Failed to toggle favorite' });
        }
    }

    // Get favorite status for current user and a chat
    async getStatus(obj) {
        try {
            const chatId = obj.params?.query?.chatId || obj.params?.chatId || obj.params?.id || obj.body?.chatId;
            if (!chatId) {
                return this.returnJson({ success: false, error: 'Chat ID is required' });
            }
            const membership = this._chatContext.UserChat
                .where(uc => uc.chat_id == $$ && uc.user_id == $$, chatId, this._currentUser.id)
                .single();
            const isFav = !!(membership && (membership.is_favorite === 1 || membership.is_favorite === true));
            return this.returnJson({ success: true, chatId: chatId, is_favorite: isFav });
        } catch (error) {
            return this.returnJson({ success: false, error: error?.message || 'Failed to get favorite status' });
        }
    }

    returnJson(obj) { return obj; }
}

module.exports = favoritesController;


