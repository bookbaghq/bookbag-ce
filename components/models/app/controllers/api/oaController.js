const master = require('mastercontroller');

class oaController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._modelContext = req.modelContext;
    }

    async list(obj) {
        try {
            const settings = this._modelContext.Settings.where(r => r.id === $$, 1).single();
            const token = settings?.openai_api_key || settings?.openai_key || '';
            if (!token) {
                return this.returnJson({ success: false, error: 'OpenAI API key is not configured' });
            }
            const baseUrl = (master.env && master.env.openai && master.env.openai.baseUrl) ? String(master.env.openai.baseUrl) : 'https://api.openai.com/v1';
            const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (!res.ok) {
                const text = await res.text();
                return this.returnJson({ success: false, error: `OpenAI list failed (${res.status})`, details: text });
            }
            const body = await res.json().catch(() => ({}));
            const data = Array.isArray(body?.data) ? body.data : [];
            const results = data.map(m => ({
                id: m.id,
                name: m.id,
                owned_by: m.owned_by || '',
                created: m.created || 0,
                type: (m.id || '').includes('embedding') ? 'embedding' : ((m.id || '').startsWith('gpt') || (m.id || '').startsWith('o')) ? 'chat' : 'other'
            }));
            return this.returnJson({ success: true, results });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    async install(obj) {
        try {
            const modelId = obj?.params?.formData?.modelId || obj?.params?.modelId;
            const title = obj?.params?.formData?.title || obj?.params?.title;
            const description = obj?.params?.formData?.description || obj?.params?.description || '';
            const serverUrl = obj?.params?.formData?.server_url || obj?.params?.server_url || '';
            const apiKey = obj?.params?.formData?.api_key || obj?.params?.api_key || '';
            const profileId = obj?.params?.formData?.profileId || obj?.params?.formData?.profile_id || obj?.params?.profileId || obj?.params?.profile_id || null;
            const contextSize = parseInt(obj?.params?.formData?.context_size || obj?.params?.context_size, 10);
            if (!modelId) return this.returnJson({ success: false, error: 'modelId is required' });

            // Avoid duplicate install (by name)
            const existingByName = this._modelContext.Model.where(r => r.name == $$, String(title || modelId)).single();
            if (existingByName) {
                return this.returnJson({ success: true, model: { id: existingByName.id, name: existingByName.name } });
            }

            const now = Date.now().toString();
            const modelEntity = require('../../models/model');
            const m = new modelEntity();
            m.name = title || modelId;
            m.description = description || `OpenAI remote model - ${modelId}`;
            m.is_published = false;
            m.created_at = now;
            m.updated_at = now;

            if (Number.isFinite(contextSize) && contextSize > 0) m.context_size = contextSize;

            if (profileId) {
                try {
                    const prof = this._modelContext.Profiles.where(r => r.id == $$, parseInt(profileId, 10)).single();
                    if (prof) m.Profile = prof.id;
                } catch (_) {}
            } else {
                const profile = this._modelContext.Profiles.where(r => r.name == $$, "OpenAI").single();
                m.Profile = profile?.id || 0;
            }

            if (serverUrl) m.server_url = String(serverUrl);
            if (apiKey) m.api_key = String(apiKey);

            this._modelContext.Model.add(m);
            this._modelContext.saveChanges();

            return this.returnJson({ success: true, model: { id: m.id, name: m.name, server_url: m.server_url || '', api_key: m.api_key || '', profile_id: m.profile_id || m.Profile || null } });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    returnJson(obj) { return obj; }
}

module.exports = oaController;


