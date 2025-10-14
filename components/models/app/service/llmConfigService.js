const path = require('path');
const fs = require('fs');

class llmConfigService {
    constructor() {
        this.configCache = null;
        this.lastCacheTime = 0;
        this.cacheTimeout = 60000; // 1 minute cache
        this._rootDir = null;
    }

    // Get root directory - handle both mastercontroller and standalone contexts
    getRootDir() {
        if (this._rootDir) return this._rootDir;
        
        try {
            const master = require('mastercontroller');
            if (master && master.root) {
                this._rootDir = master.root;
            } else {
                // If master exists but root is null, use cwd
                this._rootDir = process.cwd();
            }
        } catch (e) {
            // If mastercontroller module not found
            this._rootDir = process.cwd();
        }
        
        return this._rootDir;
    }

    // Main method to get model configuration
    async getModelConfig(modelId) {
        // If a numeric ID is provided, resolve from database using Profiles + Overrides
        if (modelId && String(modelId).match(/^\d+$/)) {
            try {
                const dbConfig = await this.getConfigFromDatabaseByModelId(parseInt(modelId, 10));
                if (dbConfig) {
                    return dbConfig;
                }
            } catch (e) {
                console.error('DB-backed model config failed, falling back to JSON config if available:', e?.message);
            }
        }

        // Fallback: attempt to resolve by name in DB
        const modelContext = require(`${this.getRootDir()}/components/models/app/models/modelContext`);
        const ctx = new modelContext();
        let m = null;
        try { m = ctx.Model.where(r => r.name == $$, String(modelId)).single(); } catch (_) {}
        if (!m) {
            const firstId = await this.getFirstPublishedModelId();
            if (!firstId) throw new Error(`Model not found: ${modelId}`);
            return await this.getConfigFromDatabaseByModelId(parseInt(firstId, 10));
        }
        return await this.getConfigFromDatabaseByModelId(parseInt(m.id, 10));
    }

    // Removed legacy getAllConfigs

    // DB-backed configuration for a specific Model.id using Profiles + ProfileFieldRules + ModelOverrides
    async getConfigFromDatabaseByModelId(modelId) {

        const modelContext = require(`${this.getRootDir()}/components/models/app/models/modelContext`);
        const ctx = new modelContext();

        const m = ctx.Model.where(r => r.id == $$, modelId).single();
        if (!m) {
            throw new Error(`Model not found: ${modelId}`);
        }

        // Resolve profile
        const profileId = m.profile_id || m.Profiles?.id || m.Profile?.id;
        let rules = [];
        var prof = null;
        if (profileId) {
            try {
                // Inherit profile rules
                prof = ctx.Profiles.where(r => r.id == $$, profileId).single();
                rules = prof?.ProfileFieldRules ? prof.ProfileFieldRules.toList ? prof.ProfileFieldRules.toList() : prof.ProfileFieldRules : prof?.ProfileFieldRules || [];
                // Ensure array
                if (!Array.isArray(rules)) {
                    rules = prof?.ProfileFieldRules ? prof.ProfileFieldRules : [];
                }
            } catch (_) {
                rules = [];
            }
        }

        // Build maps of rule name -> meta and default value
        const defaults = {};
        const ruleMeta = {};
        for (const r of rules) {
            if (!r || !r.name) continue;
            defaults[r.name] = r.default_value;
            ruleMeta[r.name] = {
                field_type: (r.field_type || '').toString().toLowerCase(),
                range: (r.range || '').toString()
            };
        }


        // Apply overrides for this model (defensive: ensure iterable)
        let overrides = [];
        try {
            const raw = ctx.ModelOverrides.where(o => o.model_id == $$, modelId).toList();
            if (Array.isArray(raw)) {
                overrides = raw;
            } else if (raw && typeof raw[Symbol.iterator] === 'function') {
                overrides = Array.from(raw);
            } else if (raw) {
                overrides = [raw];
            }
        } catch (_) {
            overrides = [];
        }
        const effective = { ...defaults };
        for (const ov of overrides) {
            try {

                for (const ru of rules) {
                    if(ru.id === ov.profile_field_rule_id ) {
                        const key = ru?.name;
                        if(key === "stop_strings") {
                            effective["stop_strings"] = ov.StopStrings || ov.stop_strings || ov.stop || [];
                        }else{
                            if (typeof ov.value !== 'undefined' && ov.value !== null) {
                                effective[key] = ov.value;
                            }
                        }
                    }
                }
            
            } catch (_) {}
        }

        // Coerce values based on rule field_type definitions
        const coerceByType = (type, value, rangeStr) => {
            const t = (type || '').toLowerCase();
            if (value === null || typeof value === 'undefined') return undefined;
            if (t === 'integer' || t === 'int') {
                const n = parseInt(value, 10);
                return Number.isFinite(n) ? n : undefined;
            }
            if (t === 'float' || t === 'number' || t === 'range') {
                const n = parseFloat(value);
                return Number.isFinite(n) ? n : undefined;
            }
            if (t === 'boolean' || t === 'bool') {
                if (typeof value === 'boolean') return value;
                const s = String(value).trim().toLowerCase();
                if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true;
                if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false;
                return undefined;
            }
            if (t === 'json') {
                if (typeof value === 'object') return value;
                if (typeof value === 'string') { try { return JSON.parse(value); } catch (_) { return undefined; } }
                return undefined;
            }
            // string, text, dropdown, thread or unknown types -> keep as string
            return String(value);
        };

        const settings = {};
        for (const key of Object.keys(effective)) {
            const meta = ruleMeta[key] || { field_type: 'string', range: '' };
            const coerced = coerceByType(meta.field_type, effective[key], meta.range);
            if (typeof coerced !== 'undefined') {
                settings[key] = coerced;
            }
        }
        // IMPORTANT: Do NOT place model.context_size inside settings unless there is an explicit rule named context_size
        // Expose model.context_size as a top-level field instead
        let contextSizeValue = 0;
        try {
            const modelCtxSize = Number(m.context_size ?? 0);
            contextSizeValue = Number.isFinite(modelCtxSize) && modelCtxSize > 0 ? modelCtxSize : 0;
        } catch (_) {
            contextSizeValue = 0;
        }

         // Auto-detect provider from server_url if not explicitly set
         let provider = (m.provider || '').toLowerCase().trim();
         if (!provider && m.server_url) {
             const url = String(m.server_url).toLowerCase();
             if (url.includes('x.ai')) provider = 'grok';
             else if (url.includes('anthropic')) provider = 'anthropic';
             else if (url.includes('openai')) provider = 'openai';
             else provider = 'openai'; // Default fallback
         }
         if (!provider) provider = 'openai';

         // Get grounding mode (strict or soft)
         const groundingMode = (m.grounding_mode || '').toLowerCase().trim() || 'strict';

         return {
             id: String(m.id),
             name: m.name,
             description: m.description || '',
             server_url: m.server_url || '',
             api_key: m.api_key || '',
             prompt_template: m.prompt_template || '',
             system_prompt: m.system_prompt || '',
             auto_trim_on: !!m.auto_trim_on,
             context_size: contextSizeValue,
             provider: provider,
             grounding_mode: groundingMode,
             settings
         };
    }

    // Remove JSON legacy: replaced by DB-backed methods above

    // Clear cache (useful when updating configs)
    clearCache() {
        this.configCache = null;
        this.lastCacheTime = 0;
    }

    // Returns the first published model id (or null if none)
    async getFirstPublishedModelId() {
        try {
            const modelContext = require(`${this.getRootDir()}/components/models/app/models/modelContext`);
            const ctx = new modelContext();
            let list = [];
            try {
                list = ctx.Model
                    .where(r => r.is_published == $$, 1)
                    .orderBy(m => m.created_at)
                    .toList();
            } catch (_) {
                list = [];
            }
            if (Array.isArray(list) && list.length > 0) {
                return list[0].id;
            }
            return null;
        } catch (_) {
            return null;
        }
    }
}

module.exports = new llmConfigService();
