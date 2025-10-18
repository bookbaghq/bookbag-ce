const master = require('mastercontroller');
const promptTemplateService = require(`${master.root}/components/chats/app/service/promptTemplateService`);

/**
 * ModelService - OpenAI-compatible only
 */
class ModelService {
    constructor() {
        if (ModelService.instance) return ModelService.instance;
        this.modelLoadingPromise = null;
        this.activeContexts = new Set();
        this.cleanupHandler = null;
        this.listenersSetup = false;
        ModelService.instance = this;
        this.setupGracefulShutdown();
    }

    /**
     * Unified generation dispatcher - routes to provider-specific implementations
     * @param {Array} messageHistory - Conversation history
     * @param {Function} onChunk - Streaming callback
     * @param {boolean} noThinking - Whether to disable thinking detection
     * @param {Object} modelConfig - Model configuration with provider field
     * @returns {Promise<Object>} - Generation result
     */
    async _generate(messageHistory, onChunk, noThinking, modelConfig) {
        const provider = (modelConfig?.provider || 'openai').toLowerCase();

        console.log(`🎯 ModelService routing to provider: ${provider}`);

        switch (provider) {
            case 'openai':
            case 'azure':
                return await this._generateViaOpenAICompatible(messageHistory, onChunk, noThinking, modelConfig);

            case 'grok':
                // Grok uses OpenAI-compatible API
                return await this._generateViaOpenAICompatible(messageHistory, onChunk, noThinking, modelConfig);

            case 'anthropic':
                // Future: Implement Claude-specific generation
                throw new Error('Anthropic/Claude provider not yet implemented. Coming soon!');

            case 'ollama':
                // Future: Implement Ollama-specific generation
                throw new Error('Ollama provider not yet implemented. Coming soon!');

            default:
                console.warn(`⚠️  Unknown provider '${provider}', falling back to OpenAI-compatible`);
                return await this._generateViaOpenAICompatible(messageHistory, onChunk, noThinking, modelConfig);
        }
    }

    async _generateViaOpenAICompatible(messageHistory, onChunk, noThinking, modelConfig ) {
        const settings = modelConfig.settings;
        const baseUrl = String(modelConfig.server_url || '').replace(/\/?$/, '/');
        const apiKey = String(modelConfig.api_key || '');
        const modelName = String(modelConfig.name || '');
        if (!apiKey) {
            const err = new Error('Missing per-model API key. Please set the api_key on this model.');
            err.code = 'MISSING_MODEL_API_KEY';
            err.provider = 'openai-compatible';
            throw err;
        }
        try { console.log(`🔑 Using per-model API key (len=${apiKey.length}) for model ${modelConfig.id} via ${baseUrl}`); } catch (_) {}
        const url = `${baseUrl}chat/completions`;
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const templateString = String(modelConfig.prompt_template || '').trim();
        const systemPrompt = (typeof modelConfig.system_prompt === 'string' && modelConfig.system_prompt.trim().length > 0)
            ? modelConfig.system_prompt.trim()
            : '';
        let oaiMessages = [];
        if (templateString) {
            try {
                oaiMessages = promptTemplateService.renderToOpenAIMessages(templateString, messageHistory, systemPrompt);
            } catch (e) {
                console.error('⚠️ Template rendering failed, falling back to naive messages:', e?.message);
            }
        }
        if (oaiMessages.length === 0) {
            for (const m of messageHistory) {
                const role = (m.role || '').toLowerCase();
                if (role === 'system' || role === 'user' || role === 'assistant') {
                    // Check if message has attachments (images)
                    if (m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0) {
                        // Vision API format: content as array with text and image_url objects
                        const contentArray = [
                            {
                                type: 'text',
                                text: String(m.content || '')
                            }
                        ];

                        // Add each image URL
                        for (const imageUrl of m.attachments) {
                            contentArray.push({
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl
                                }
                            });
                        }

                        oaiMessages.push({ role, content: contentArray });
                    } else {
                        // Regular text-only message
                        oaiMessages.push({ role, content: String(m.content || '') });
                    }
                }
            }
        }

        // Build payload dynamically from settings. Only hardcode model, messages, and stream.
        const basePayload = {
            model: modelName,
            messages: oaiMessages,
            stream: true
        };
        const settingsPayload = {};
        try {
            if (settings && typeof settings === 'object') {
                for (const key of Object.keys(settings)) {
                    // Do not allow settings to override reserved payload keys
                    if (key === 'model' || key === 'messages' || key === 'stream') continue;
                    const value = settings[key];
                    if (value === null || typeof value === 'undefined') continue;
                    settingsPayload[key] = value;
                }
            }
        } catch (_) {}
        const payload = Object.assign({}, basePayload, settingsPayload);

        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            const errorService = require(`${master.root}/app/service/errorService`);
            const normalized = errorService.normalizeProviderError(txt, res.status, 'openai-compatible');
            const err = new Error(normalized.message || `OpenAI-compatible request failed (${res.status})`);
            err.status = normalized.status; err.code = normalized.code; err.type = normalized.type; err.provider = normalized.provider; err.details = normalized.details; throw err;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/event-stream')) {
            const data = await res.json().catch(async () => ({ choices: [{ message: { content: await res.text() } }]}));
            const text = data?.choices?.[0]?.message?.content || '';
            if (onChunk && text) onChunk(text);
            return { response: text, metadata: { completed: true, model: modelConfig.id } };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        let done = false;
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            if (readerDone) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                const t = line.trim();
                if (!t) continue; if (!t.startsWith('data:')) continue; const data = t.slice(5).trim(); if (data === '[DONE]') { done = true; break; }
                try {
                    const obj = JSON.parse(data);
                    const delta = obj?.choices?.[0]?.delta?.content || '';
                    if (delta) {
                        full += delta;
                        if (onChunk) onChunk(delta);
                    }
                } catch (_) { }
            }
        }
        return { response: full, metadata: { completed: true, model: modelConfig.id } };
    }

    setupGracefulShutdown() {
        if (this.listenersSetup) return; if (this.cleanupHandler) {
            process.removeListener('beforeExit', this.cleanupHandler);
            process.removeListener('SIGINT', this.cleanupHandler);
            process.removeListener('SIGTERM', this.cleanupHandler);
        }
        this.cleanupHandler = async () => {
            console.log("🧹 Cleaning up active contexts...");
            for (const context of this.activeContexts) {
                try { if (context && !context.disposed) { await context.dispose(); } } catch (e) { console.error("❌ Error disposing context on exit:", e); }
            }
            this.activeContexts.clear();
            console.log("✅ Model service cleanup complete");
        };
        const currentListeners = process.listenerCount('beforeExit');
        if (currentListeners < 10) {
            process.on('beforeExit', this.cleanupHandler);
            process.on('SIGINT', this.cleanupHandler);
            process.on('SIGTERM', this.cleanupHandler);
            this.listenersSetup = true;
            console.log(`🔧 ModelService singleton event listeners set up (current beforeExit listeners: ${currentListeners + 1})`);
        } else {
            console.warn(`⚠️ Not adding more listeners - already at limit (${currentListeners} beforeExit listeners)`);
            this.listenersSetup = true;
        }
    }

    async dispose() {
        console.log("🧹 Disposing ModelService singleton...");
        if (this.cleanupHandler && this.listenersSetup) {
            process.removeListener('beforeExit', this.cleanupHandler);
            process.removeListener('SIGINT', this.cleanupHandler);
            process.removeListener('SIGTERM', this.cleanupHandler);
            this.cleanupHandler = null;
            this.listenersSetup = false;
        }
        for (const context of this.activeContexts) { await this.safeDisposeContext(context); }
        this.activeContexts.clear();
        this.modelLoadingPromise = null;
        ModelService.instance = null;
        console.log("✅ ModelService singleton disposed");
    }

    async safeDisposeContext(context) { try { if (context && !context.disposed && typeof context.dispose === 'function') { await context.dispose(); } } catch (e) { console.debug("⚠️ Context disposal warning:", e.message); } }

    static getInstance() { if (!ModelService.instance) { new ModelService(); } return ModelService.instance; }
}

module.exports = ModelService;
