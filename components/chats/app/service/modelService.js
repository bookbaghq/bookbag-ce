const master = require('mastercontroller');
const OpenAIAdapter = require(`${master.root}/components/chats/app/service/adapters/openaiAdapter`);

/**
 * ModelService - Multi-provider AI model service
 * Supports: OpenAI, Azure OpenAI, Grok, and other OpenAI-compatible APIs
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
     * Unified generation dispatcher - routes to provider-specific adapters
     * @param {Array} messageHistory - Conversation history
     * @param {Function} onChunk - Streaming callback
     * @param {boolean} noThinking - Whether to disable thinking detection
     * @param {Object} modelConfig - Model configuration with provider field
     * @returns {Promise<Object>} - Generation result
     */
    async _generate(messageHistory, onChunk, noThinking, modelConfig) {
        const provider = (modelConfig?.provider || 'openai').toLowerCase();

        console.log(`🎯 ModelService routing to provider: ${provider}`);

        // All providers use OpenAI-compatible adapter
        // Supports: OpenAI, Azure OpenAI, Grok, and any OpenAI-compatible API
        const adapter = new OpenAIAdapter();
        return await adapter.generate(messageHistory, onChunk, noThinking, modelConfig);
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
