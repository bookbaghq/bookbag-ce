
const master = require('mastercontroller');
//const ModelService = require(`${master.root}/components/chats/app/service/modelService`);
const path = require('path');
const fs = require('fs');
const os = require('os');

class modelsController{

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;
        this._modelContext = req.modelContext;

        // Initialize ModelService
        //this.modelService = new ModelService();
        
    }

    /**
     * Get published models for chat UI
     */
    async getPublishedModels() {
        try {
            const models = this._modelContext.Model
                .where(r => r.is_published == $$, 1)
                .orderBy(m => m.created_at)
                .toList();

            const mapped = models.map(m => {
                const name = m.name || '';
                const lower = name.toLowerCase();
                const family = lower.includes('llama') ? 'llama' : lower.includes('qwen') ? 'qwen' : lower.includes('gemma') ? 'gemma' : lower.includes('deepseek') ? 'deepseek' : 'other';

                return {
                    id: m.id,
                    name: m.name,
                    label: m.name, // UI prefers label when present
                    type: family,
                    settings: {
                        context_size: m.context_size || 0,
                    },
                };
            });

            return this.returnJson({ success: true, models: mapped });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    /**
     * Create a new vLLM model entry (unpublished by default)
     */
    async createServerModel(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const name = (f.name || '').toString().trim();
            const description = (f.description || '').toString();
            const profileId = parseInt(f.profileId, 10);
            const serverUrl = (f.server_url || f.vllm_server_url || '').toString().trim();
            const apiKey = (f.api_key || '').toString();
            const autoTrimOn = !!(f.auto_trim_on === true || f.auto_trim_on === 'true' || f.auto_trim_on === 1 || f.auto_trim_on === '1');
            const contextSize = parseInt(f.context_size, 10);
            const promptTemplate = (f.prompt_template || '').toString();
            const systemPrompt = (f.system_prompt || '').toString();
            const thinkingStrings = Array.isArray(f.thinking_strings) ? f.thinking_strings : [];
            const provider = (f.provider || '').toString().trim() || 'openai';
            const groundingMode = (f.grounding_mode || '').toString().trim() || 'strict';

            if (!name) return this.returnJson({ success: false, error: 'name is required' });
            if (!profileId) return this.returnJson({ success: false, error: 'profileId is required' });
            if (!serverUrl) return this.returnJson({ success: false, error: 'server_url is required' });
            if (!Number.isFinite(contextSize) || contextSize <= 0) return this.returnJson({ success: false, error: 'context_size is required and must be > 0' });

            // Validate profile exists
            const profile = this._modelContext.Profiles.where(r => r.id == $$, profileId).single();
            if (!profile) return this.returnJson({ success: false, error: 'Profile not found' });

            const ModelEntity = require(`${master.root}/components/models/app/models/model`);
            const m = new ModelEntity();
            m.name = name;
            m.Profile = profileId;
            m.description = description;
            // Keep server URL only (no file_location)
            m.server_url = serverUrl;
            if (apiKey) m.api_key = apiKey;
            if (promptTemplate) m.prompt_template = promptTemplate;
            if (systemPrompt) m.system_prompt = systemPrompt;
            m.is_published = false;
            if (typeof f.auto_trim_on !== 'undefined') m.auto_trim_on = autoTrimOn;
            m.context_size = contextSize;
            m.provider = provider;
            m.grounding_mode = groundingMode;
            m.created_at = Date.now().toString();
            m.updated_at = Date.now().toString();
            this._modelContext.Model.add(m);
            this._modelContext.saveChanges();

            // Persist any provided thinking strings for this new model
            try {
                if (Array.isArray(thinkingStrings) && thinkingStrings.length > 0) {
                    const StartThinkingStrings = require(`${master.root}/components/models/app/models/startThinkingStrings`);
                    for (const ts of thinkingStrings) {
                        const endWord = (ts?.end_word || ts?.endWord || '').toString().trim();
                        if (!endWord) continue;
                        const rec = new StartThinkingStrings();
                        rec.Model = m.id;
                        rec.start_word = (ts?.start_word || ts?.startWord || '').toString();
                        rec.end_word = endWord;
                        rec.created_at = Date.now().toString();
                        rec.updated_at = Date.now().toString();
                        this._modelContext.StartThinkingStrings.add(rec);
                    }
                    this._modelContext.saveChanges();
                }
            } catch (_) {}

            return this.returnJson({
                success: true,
                model: {
                    id: m.id,
                    name: m.name,
                    description: m.description || '',
                    api_key: m.api_key || '',
                    is_published: !!m.is_published,
                    created_at: m.created_at,
                    updated_at: m.updated_at,
                    profile_id: profileId,
                    auto_trim_on: !!m.auto_trim_on,
                    context_size: m.context_size,
                    prompt_template: m.prompt_template || '',
                    system_prompt: m.system_prompt || '',
                    provider: m.provider || 'openai',
                    grounding_mode: m.grounding_mode || 'strict',
                }
            });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    /**
     * Toggle publish state for a model
     */
    async setPublished(obj) {
        try {
            const id = obj?.params?.formData?.id || obj?.params?.id;
            const is_published = obj?.params?.formData?.is_published;
            if (!id || typeof is_published === 'undefined') {
                return this.returnJson({ success: false, error: 'id and is_published are required' });
            }

            const model = this._modelContext.Model.where(r => r.id == $$, parseInt(id, 10)).single();
            if (!model) {
                return this.returnJson({ success: false, error: 'Model not found' });
            }

            model.is_published = is_published;
            model.updated_at = Date.now().toString();
            this._modelContext.saveChanges();

            return this.returnJson({ success: true, id: model.id, is_published: !!model.is_published });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    /**
     * Get a specific model with settings and stop strings
     */
    async getModelById(obj) {
        try {
            const id = obj?.params?.query?.id;
            if (!id) {
                return this.returnJson({ success: false, error: 'id is required' });
            }
            const m = this._modelContext.Model.where(r => r.id == $$, parseInt(id, 10)).single();
            if (!m) return this.returnJson({ success: false, error: 'Model not found' });
            let promptTemplates = [];

            try {
                const specific = this._modelContext.PromptTemplates.toList();
                const promptTemplatesVM = require(`${master.root}/components/models/app/vm/promptTemplates`);
                const mapped = obj._mapper({ "promptTemplates": { templates: specific } }, promptTemplatesVM);
                promptTemplates = Array.isArray(mapped?.promptTemplates) ? mapped.promptTemplates : [];
            } catch (_) {}

            return this.returnJson({
                success: true,
                model: {
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    server_url: m.server_url || '',
                    system_prompt: m.system_prompt || '',
                    prompt_template: m.prompt_template || '',
                    context_size: m.context_size,
                    auto_trim_on: !!(m.auto_trim_on === true || m.auto_trim_on === 1 || m.auto_trim_on === '1' || String(m.auto_trim_on).toLowerCase() === 'true'),
                    promptTemplates
                }
            });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    /**
     * Update model settings and stop strings
     */
    async updateModel(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const id = f.id;
            if (!id) return this.returnJson({ success: false, error: 'id is required' });

            const m = this._modelContext.Model.where(r => r.id == $$, parseInt(id, 10)).single();
            if (!m) return this.returnJson({ success: false, error: 'Model not found' });
            const profileId = f.profile_id || f.profileId;
            if (typeof profileId !== 'undefined') m.Profile = parseInt(profileId, 10);
            m.name = f.name;
            m.description = f.description;
            m.system_prompt = f.system_prompt;
            m.prompt_template = f.prompt_template;
            m.server_url = f.server_url;
            m.api_key = f.api_key;

            if (typeof f.auto_trim_on !== 'undefined') {
                const autoTrimOn = !!(f.auto_trim_on === true || f.auto_trim_on === 'true' || f.auto_trim_on === 1 || f.auto_trim_on === '1');
                m.auto_trim_on = autoTrimOn;
            }
            if (typeof f.context_size !== 'undefined') {
                const cs = parseInt(f.context_size, 10);
                if (Number.isFinite(cs) && cs > 0) m.context_size = cs;
            }
            if (typeof f.provider !== 'undefined') {
                m.provider = (f.provider || '').toString().trim() || 'openai';
            }
            if (typeof f.grounding_mode !== 'undefined') {
                m.grounding_mode = (f.grounding_mode || '').toString().trim() || 'strict';
            }

            m.updated_at = Date.now().toString();

            this._modelContext.saveChanges();
            return this.returnJson({ success: true, model: { id: m.id, name: m.name, description: m.description || '', server_url: m.server_url || '', api_key: m.api_key || '', profile_id: m.profile_id || m.Profile || null, updated_at: m.updated_at, auto_trim_on: !!m.auto_trim_on, context_size: m.context_size, provider: m.provider || 'openai', grounding_mode: m.grounding_mode || 'strict' } });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    /**
     * Return default model settings from JSON
     */
    async getModelDefaults(obj) {
        try {
            const defaultsPath = path.join(master.root, 'config', 'model-defaults.json');
            if (!fs.existsSync(defaultsPath)) {
                return this.returnJson({ success: true, defaults: null });
            }
            const raw = fs.readFileSync(defaultsPath, 'utf8');
            const json = JSON.parse(raw);
            return this.returnJson({ success: true, defaults: json });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }


     /**
     * Get stored models from DB (Model table)
     */
    async getModels(obj) {
        try {
            const models = this._modelContext.Model
                .orderBy(m => m.created_at)
                .toList();

            const mapped = models.map(m => {
                const name = m.name || '';
                const lower = name.toLowerCase();
                const family = lower.includes('llama') ? 'llama' : lower.includes('qwen') ? 'qwen' : lower.includes('gemma') ? 'gemma' : lower.includes('deepseek') ? 'deepseek' : 'other';
                let profileName = '';
                let profileId = null;
                try {
                    const prof = this._modelContext.Profiles.where(r => r.id == $$, m.profile_id).single();
                    profileName = prof?.name || '';
                    profileId = prof?.id || m.profile_id || null;
                } catch (_) {}
                let promptTemplates = [];
                try {
                    // Get all prompt templates (PromptTemplates table doesn't have model_id column yet)
                    const allTemplates = this._modelContext.PromptTemplates.toList();
                    promptTemplates = allTemplates.map(t => ({ id: t.id, name: t.name, template: t.template }));
                } catch (_) {}

                return {
                    id: m.id,
                    name: m.name,
                    description: m.description || '',
                    api_key: m.api_key || '',
                    is_published: !!m.is_published,
                    created_at: m.created_at,
                    updated_at: m.updated_at,
                    family,
                    profile_name: profileName,
                    profile_id: profileId,
                    server_url: m.server_url || '',
                    context_size: m.context_size,
                    system_prompt: m.system_prompt || '',
                    prompt_template: m.prompt_template || '',
                    auto_trim_on: !!(m.auto_trim_on === true || m.auto_trim_on === 1 || m.auto_trim_on === '1' || String(m.auto_trim_on).toLowerCase() === 'true'),
                    api_key: m.api_key || '',
                    provider: m.provider || 'openai',
                    grounding_mode: m.grounding_mode || 'strict',
                    promptTemplates,
                    tags: [],
                };
            });

            return this.returnJson({ success: true, models: mapped });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    /**
     * Returns system CPU core/thread information
     */
    async getCpuInfo() {
        try {
            const cpuCount = Array.isArray(os.cpus()) ? os.cpus().length : 0;
            return this.returnJson({ success: true, cpuCount });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    /**
     * Delete a model by id
     */
    async deleteModel(obj) {
        try {
            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            if (!id) return this.returnJson({ success: false, error: 'id is required' });

            const model = this._modelContext.Model.where(r => r.id == $$, id).single();
            if (!model) return this.returnJson({ success: false, error: 'Model not found' });

            // Remove any model-specific profile rules
            try {
                const rules = this._modelContext.ProfileFieldRules.where(r => r.model_id == $$, id).toList();
                for (const r of rules) this._modelContext.ProfileFieldRules.remove(r);
            } catch (_) {}

            // Remove any overrides and attached StopStrings (legacy)
            try {
                const overrides = this._modelContext.ModelOverrides.where(o => o.model_id == $$, id).toList();
                for (const o of overrides) {
                    try {
                        const attachedStopStrings = (o.StopStrings && Array.isArray(o.StopStrings))
                          ? o.StopStrings
                          : this._modelContext.StopStrings.where(s => s.model_overrides_id == $$, o.id).toList();
                        for (const s of attachedStopStrings) this._modelContext.StopStrings.remove(s);
                    } catch (_) {}
                    this._modelContext.ModelOverrides.remove(o);
                }
            } catch (_) {}

            // Remove StartThinkingStrings
            try {
                const thinking = this._modelContext.StartThinkingStrings.where(t => t.model_id == $$, id).toList();
                for (const t of thinking) this._modelContext.StartThinkingStrings.remove(t);
            } catch (_) {}

            // Finally remove the model
            this._modelContext.Model.remove(model);
            this._modelContext.saveChanges();
            return this.returnJson({ success: true });
        } catch (error) {
            return this.returnJson({ success: false, error: error.message });
        }
    }

    returnJson(obj) {
        return obj;
    }
}

module.exports = modelsController;
