const master = require('mastercontroller');
const promptTemplateService = require(`${master.root}/components/chats/app/service/promptTemplateService`);

/**
 * OpenAI-compatible adapter for model generation
 * Supports: OpenAI, Azure OpenAI, Grok (xAI), and any OpenAI-compatible API
 */
class OpenAIAdapter {
    /**
     * Generate completion using OpenAI-compatible API
     * @param {Array} messageHistory - Conversation history
     * @param {Function} onChunk - Streaming callback
     * @param {boolean} noThinking - Whether to disable thinking detection
     * @param {Object} modelConfig - Model configuration
     * @returns {Promise<Object>} - Generation result
     */
    async generate(messageHistory, onChunk, noThinking, modelConfig) {
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

        try {
            console.log(`🔑 Using per-model API key (len=${apiKey.length}) for model ${modelConfig.id} via ${baseUrl}`);
        } catch (_) {}

        const url = `${baseUrl}chat/completions`;
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        // Build OpenAI messages from history
        const oaiMessages = this._buildMessages(messageHistory, modelConfig);

        // Build payload dynamically from settings
        const payload = this._buildPayload(modelName, oaiMessages, settings);

        // Make API request
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            return this._handleError(res);
        }

        // Handle response based on content type
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/event-stream')) {
            return await this._handleNonStreamingResponse(res, onChunk, modelConfig);
        }

        return await this._handleStreamingResponse(res, onChunk, modelConfig);
    }

    /**
     * Build OpenAI messages array from message history
     * @private
     */
    _buildMessages(messageHistory, modelConfig) {
        const templateString = String(modelConfig.prompt_template || '').trim();

        // 🔥 CRITICAL RAG FIX: Extract system message from messageHistory (which may contain RAG context)
        // DON'T use modelConfig.system_prompt as it doesn't have RAG context injected
        const systemMessageFromHistory = messageHistory.find(m => m.role === 'system');
        const systemPrompt = systemMessageFromHistory
            ? String(systemMessageFromHistory.content || '').trim()
            : (typeof modelConfig.system_prompt === 'string' && modelConfig.system_prompt.trim().length > 0)
                ? modelConfig.system_prompt.trim()
                : '';

        let oaiMessages = [];

        // Try to use prompt template if available
        if (templateString) {
            try {
                // Pass the system prompt from messageHistory (with RAG context) to template renderer
                oaiMessages = promptTemplateService.renderToOpenAIMessages(
                    templateString,
                    messageHistory,
                    systemPrompt  // Now contains RAG context if present
                );
            } catch (e) {
                console.error('⚠️ Template rendering failed, falling back to naive messages:', e?.message);
            }
        }

        // Fallback to naive message conversion
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

        return oaiMessages;
    }

    /**
     * Build API payload with settings
     * @private
     */
    _buildPayload(modelName, messages, settings) {
        const basePayload = {
            model: modelName,
            messages: messages,
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

        return Object.assign({}, basePayload, settingsPayload);
    }

    /**
     * Handle API errors
     * @private
     */
    async _handleError(res) {
        const txt = await res.text().catch(() => "");
        const errorService = require(`${master.root}/app/service/errorService`);
        const normalized = errorService.normalizeProviderError(txt, res.status, 'openai-compatible');
        const err = new Error(normalized.message || `OpenAI-compatible request failed (${res.status})`);
        err.status = normalized.status;
        err.code = normalized.code;
        err.type = normalized.type;
        err.provider = normalized.provider;
        err.details = normalized.details;
        throw err;
    }

    /**
     * Handle non-streaming response
     * @private
     */
    async _handleNonStreamingResponse(res, onChunk, modelConfig) {
        const data = await res.json().catch(async () => ({
            choices: [{ message: { content: await res.text() } }]
        }));
        const text = data?.choices?.[0]?.message?.content || '';
        if (onChunk && text) onChunk(text);
        return {
            response: text,
            metadata: { completed: true, model: modelConfig.id }
        };
    }

    /**
     * Handle streaming response
     * @private
     */
    async _handleStreamingResponse(res, onChunk, modelConfig) {
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
                if (!t) continue;
                if (!t.startsWith('data:')) continue;

                const data = t.slice(5).trim();
                if (data === '[DONE]') {
                    done = true;
                    break;
                }

                try {
                    const obj = JSON.parse(data);
                    const delta = obj?.choices?.[0]?.delta?.content || '';
                    if (delta) {
                        full += delta;
                        if (onChunk) onChunk(delta);
                    }
                } catch (_) {}
            }
        }

        return {
            response: full,
            metadata: { completed: true, model: modelConfig.id }
        };
    }
}

module.exports = OpenAIAdapter;
