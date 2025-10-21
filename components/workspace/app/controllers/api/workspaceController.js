const master = require('mastercontroller');

class workspaceController {

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._workspaceContext = req.workspaceContext;
        this._chatContext = req.chatContext;
        this._userContext = req.userContext;
        this._modelContext = req.modelContext;

        this.beforeAction(["create","update","remove","assignUsers","assignModels"], req.authService.validateIsAdmin);
    }

    returnJson(obj){ return obj; }

    // List workspaces for current user membership
    async my(obj){
        try{
            const memberships = this._workspaceContext.WorkspaceUser
                .where(uc => uc.user_id == $$, this._currentUser.id)
                .toList();
            const ids = new Set(memberships.map(m => m.workspace_id));
            const results = this._workspaceContext.Workspace
                .orderBy(w => w.created_at)
                .toList()
                .filter(w => ids.has(w.id));
            const mapped = results.map(w => ({ id: w.id, name: w.name, description: w.description || '' }));
            return this.returnJson({ success: true, workspaces: mapped });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    // Chats for a workspace where user is a member
    async chats(obj){
        try{
            const id = parseInt(obj?.params?.query?.id, 10);
            if(!id) return this.returnJson({ success: false, error: 'id is required' });
            const isMember = this._workspaceContext.WorkspaceUser
                .where(r => r.workspace_id == $$ && r.user_id == $$, id, this._currentUser.id)
                .toList().length > 0;
            if(!isMember) return this.returnJson({ success: false, error: 'Access denied' });
            // Find chats linked to workspace
            const links = this._workspaceContext.WorkspaceChat.where(r => r.workspace_id == $$, id).toList();
            const chatIds = links.map(l => l.chat_id);
            const chats = [];
            for (const cid of chatIds) {
                try {
                    // Exclude archived and deleted chats
                    const chat = this._chatContext.Chat
                        .where(r => r.id == $$ && r.is_archived == $$ && r.is_deleted == $$, cid, 0, 0)
                        .single();
                    if (chat) chats.push(chat);
                } catch (_) { /* ignore */ }
            }
            const formatted = chats.map(chat => ({ id: chat.id, title: chat.title || 'Untitled Chat', updated_at: chat.updated_at }));
            return this.returnJson({ success: true, chats: formatted });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    async list(obj){
        try{
            const q = String(obj?.params?.query?.q || '').toLowerCase();
            let results = this._workspaceContext.Workspace.orderBy(w => w.created_at).toList();
            if (q) {
                results = results.filter(w => (String(w.name || '').toLowerCase().includes(q)) || (String(w.description || '').toLowerCase().includes(q)));
            }
            const mapped = results.map(w => ({ id: w.id, name: w.name, description: w.description || '', profile_id: w.profile_id || w.Profile || null, created_at: w.created_at, updated_at: w.updated_at }));
            return this.returnJson({ success: true, workspaces: mapped });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    async get(obj){
        try{
            const id = parseInt(obj?.params?.query?.id, 10);
            if(!id) return this.returnJson({ success: false, error: 'id is required' });
            const w = this._workspaceContext.Workspace.where(r => r.id == $$, id).single();
            if(!w) return this.returnJson({ success: false, error: 'Workspace not found' });

            // load users
            let users = [];
            try{
                const wusers = this._workspaceContext.WorkspaceUser.where(r => r.workspace_id == $$, id).toList();
                users = wusers.map(u => {
                    let user = null;
                    try { user = this._userContext.User.where(x => x.id == $$, u.user_id).single(); } catch(_) {}
                    return { id: u.id, user_id: u.user_id, role: u.role, name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '', email: user?.email || '' };
                });
            }catch(_){}

            // load models
            let models = [];
            try{
                const wmodels = this._workspaceContext.WorkspaceModel.where(r => r.workspace_id == $$, id).toList();
                models = wmodels.map(m => {
                    let model = null;
                    try { model = this._modelContext.Model.where(x => x.id == $$, m.model_id).single(); } catch(_) {}
                    return { id: m.id, model_id: m.model_id, name: model?.name || '' };
                })
            }catch(_){}

            return this.returnJson({ success: true, workspace: { id: w.id, name: w.name, description: w.description || '', profile_id: w.profile_id || null, prompt_template: w.prompt_template || '', system_prompt: w.system_prompt || '', created_at: w.created_at, updated_at: w.updated_at, users, models } });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    async create(obj){
        try{
            const f = obj?.params?.formData || obj?.params || {};
            const name = String(f.name || '').trim();
            if(!name) return this.returnJson({ success: false, error: 'name is required' });
            const Workspace = require(`${master.root}/components/workspace/app/models/workspace`);
            const w = new Workspace();
            const now = Date.now().toString();
            w.name = name;
            w.description = String(f.description || '');
            if (f.profile_id || f.profileId) w.Profile = parseInt(f.profile_id || f.profileId, 10);
            if (typeof f.prompt_template === 'string') w.prompt_template = f.prompt_template;
            if (typeof f.system_prompt === 'string') w.system_prompt = f.system_prompt;
            w.created_at = now; w.updated_at = now;
            this._workspaceContext.Workspace.add(w);
            this._workspaceContext.saveChanges();
            return this.returnJson({ success: true, id: w.id });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    async update(obj){
        try{
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            if(!id) return this.returnJson({ success: false, error: 'id is required' });
            const w = this._workspaceContext.Workspace.where(r => r.id == $$, id).single();
            if(!w) return this.returnJson({ success: false, error: 'Workspace not found' });
            if (typeof f.name === 'string') w.name = f.name;
            if (typeof f.description === 'string') w.description = f.description;
            if (f.profile_id || f.profileId) w.Profile = parseInt(f.profile_id || f.profileId, 10);
            if (typeof f.prompt_template === 'string') w.prompt_template = f.prompt_template;
            if (typeof f.system_prompt === 'string') w.system_prompt = f.system_prompt;
            w.updated_at = Date.now().toString();
            this._workspaceContext.saveChanges();
            return this.returnJson({ success: true });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    async remove(obj){
        try{
            console.log('🗑️  Remove method called');
            console.log('   obj exists?', !!obj);
            console.log('   obj.params exists?', !!obj?.params);
            console.log('   obj.params.formData exists?', !!obj?.params?.formData);

            const f = obj?.params?.formData || obj?.params || {};
            console.log('   f type:', typeof f);
            console.log('   f.id:', f?.id);

            const id = parseInt(f.id, 10);
            console.log(`   Parsed ID: ${id}`);

            if(!id) return this.returnJson({ success: false, error: 'id is required' });

            const w = this._workspaceContext.Workspace.where(r => r.id == $$, id).single();
            if(!w) return this.returnJson({ success: false, error: 'Workspace not found' });

            console.log(`   Found workspace: ${w.name}`);

            // Remove workspace users
            try{
                const links = this._workspaceContext.WorkspaceUser.where(r => r.workspace_id == $$, id).toList();
                console.log(`   Removing ${links.length} workspace user links`);
                for(const l of links) this._workspaceContext.WorkspaceUser.remove(l);
            }catch(err){
                console.error('   Error removing workspace users:', err.message);
            }

            // Remove workspace models
            try{
                const links = this._workspaceContext.WorkspaceModel.where(r => r.workspace_id == $$, id).toList();
                console.log(`   Removing ${links.length} workspace model links`);
                for(const l of links) this._workspaceContext.WorkspaceModel.remove(l);
            }catch(err){
                console.error('   Error removing workspace models:', err.message);
            }

            // Remove model overrides
            try{
                const links = this._modelContext.ModelOverrides.where(r => r.workspace_id == $$, id).toList();
                console.log(`   Removing ${links.length} model overrides`);
                for(const l of links) this._modelContext.ModelOverrides.remove(l);
                this._modelContext.saveChanges();
            }catch(err){
                console.error('   Error removing model overrides:', err.message);
            }

            // Remove workspace chats
            try{
                const links = this._workspaceContext.WorkspaceChat.where(r => r.workspace_id == $$, id).toList();
                console.log(`   Removing ${links.length} workspace chat links`);
                for(const l of links) this._workspaceContext.WorkspaceChat.remove(l);
            }catch(err){
                console.error('   Error removing workspace chats:', err.message);
            }

            // Remove the workspace itself
            console.log(`   Removing workspace entity`);
            this._workspaceContext.Workspace.remove(w);
            this._workspaceContext.saveChanges();

            console.log(`✅ Workspace ${id} deleted successfully`);
            return this.returnJson({ success: true });
        }catch(error){
            console.error(`❌ Error deleting workspace:`, error);
            return this.returnJson({ success: false, error: error.message });
        }
    }

    async assignUsers(obj){
        try{
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            const users = Array.isArray(f.users) ? f.users : [];
            if(!id) return this.returnJson({ success: false, error: 'id is required' });
            const WorkspaceUser = require(`${master.root}/components/workspace/app/models/workspaceUser`);
            // Clear existing
            try{ const links = this._workspaceContext.WorkspaceUser.where(r => r.workspace_id == $$, id).toList(); for(const l of links) this._workspaceContext.WorkspaceUser.remove(l);}catch(_){ }
            // Add new
            const now = Date.now().toString();
            for(const u of users){
                const wu = new WorkspaceUser();
                wu.Workspace = id;
                wu.user_id = parseInt(u.user_id || u.id || u, 10);
                wu.role = String(u.role || 'member');
                wu.created_at = now; wu.updated_at = now;
                this._workspaceContext.WorkspaceUser.add(wu);
            }
            this._workspaceContext.saveChanges();
            return this.returnJson({ success: true });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    async assignModels(obj){
        try{
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            const models = Array.isArray(f.models) ? f.models : [];
            if(!id) return this.returnJson({ success: false, error: 'id is required' });
            const WorkspaceModel = require(`${master.root}/components/workspace/app/models/workspaceModel`);
            // Clear existing
            try{ const links = this._workspaceContext.WorkspaceModel.where(r => r.workspace_id == $$, id).toList(); for(const l of links) this._workspaceContext.WorkspaceModel.remove(l);}catch(_){ }
            // Add new
            const now = Date.now().toString();
            for(const m of models){
                const wm = new WorkspaceModel();
                wm.Workspace = id;
                wm.model_id = parseInt(m.model_id || m.id || m, 10);
                wm.created_at = now; wm.updated_at = now;
                this._workspaceContext.WorkspaceModel.add(wm);
            }
            this._workspaceContext.saveChanges();
            return this.returnJson({ success: true });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    // Create a new chat under a workspace for the current user
    async createChat(obj){
        try{
            const f = obj?.params?.formData || obj?.params || {};
            const wid = parseInt(f.workspace_id || f.workspaceId || f.id, 10);
            const title = (f.title && String(f.title).trim()) ? String(f.title).trim() : 'thread';
            if(!wid) return this.returnJson({ success: false, error: 'workspace_id is required' });

            // Verify membership
            const isMember = this._workspaceContext.WorkspaceUser
                .where(r => r.workspace_id == $$ && r.user_id == $$, wid, this._currentUser.id)
                .toList().length > 0;
            if(!isMember) return this.returnJson({ success: false, error: 'Access denied' });

            // Create chat
            const chatEntity = require(`${master.root}/components/chats/app/models/chat`);
            const userChatEntity = require(`${master.root}/components/chats/app/models/userchat`);
            const WorkspaceChat = require(`${master.root}/components/workspace/app/models/workspaceChat`);

            const now = Date.now().toString();
            const chat = new chatEntity();
            chat.created_at = now;
            chat.is_workspace_created = true;
            chat.updated_at = now;
            chat.session_id = (require('crypto').randomBytes(16).toString('hex'));
            chat.total_token_count = 0;
            chat.title = title;
            chat.is_admin_created = false;
            this._chatContext.Chat.add(chat);
            this._chatContext.saveChanges();

            // Ensure current user is a member of the new chat (required for access)
            try {
                const uc = new userChatEntity();
                uc.Chat = chat.id;
                uc.user_id = String(this._currentUser.id);
                uc.created_at = now;
                uc.updated_at = now;
                this._chatContext.UserChat.add(uc);
                this._chatContext.saveChanges();
            } catch (_) {}

            // Link workspace
            const wc = new WorkspaceChat();
            wc.Workspace = wid;
            wc.chat_id = chat.id;
            wc.created_at = now;
            wc.updated_at = now;
            this._workspaceContext.WorkspaceChat.add(wc);
            this._workspaceContext.saveChanges();

            return this.returnJson({ success: true, chat: { id: chat.id, title: chat.title } });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }

    // Given a chatId, return allowed model IDs for the workspace(s) that include this chat
    async chatAllowedModels(obj){
        try{
            const chatId = parseInt(obj?.params?.query?.chatId, 10);
            if(!chatId) return this.returnJson({ success: false, error: 'chatId is required' });

            // Find all workspaces that contain this chat
            const links = this._workspaceContext.WorkspaceChat.where(r => r.chat_id == $$, chatId).toList();
            if (!Array.isArray(links) || links.length === 0) {
                return this.returnJson({ success: true, models: [], workspaceIds: [] });
            }
            const workspaceIds = Array.from(new Set(links.map(l => l.workspace_id)));

            // Verify the current user is a member of at least one of these workspaces
            const isMember = this._workspaceContext.WorkspaceUser
                .where(r => r.user_id == $$, this._currentUser.id)
                .toList()
                .some(wu => workspaceIds.includes(wu.workspace_id));
            if (!isMember) return this.returnJson({ success: false, error: 'Access denied' });

            // Collect allowed model ids across those workspaces
            const allowed = new Set();
            for (const wid of workspaceIds) {
                try {
                    const wmodels = this._workspaceContext.WorkspaceModel.where(r => r.workspace_id == $$, wid).toList();
                    for (const wm of wmodels) {
                        if (wm.model_id != null) allowed.add(String(wm.model_id));
                    }
                } catch (_) { /* ignore */ }
            }

            return this.returnJson({ success: true, models: Array.from(allowed), workspaceIds });
        }catch(error){
            return this.returnJson({ success: false, error: error.message });
        }
    }
}

module.exports = workspaceController;


