const master = require('mastercontroller');

/**
 * ModelRouterService - Cursor-style Auto Model Router
 *
 * Automatically selects the optimal model based on:
 * - Prompt complexity and length
 * - Token count estimation
 * - Keyword detection (code, reasoning, news, etc.)
 * - User's available models
 *
 * This implements a fast, rule-driven approach similar to Cursor's "Auto" mode
 * to save tokens on simple queries while using more powerful models for complex tasks.
 */
class ModelRouterService {
    constructor(availableModels) {
        // Store available models for this user/context
        this.availableModels = availableModels || [];

        // Model tier definitions - adjust based on your actual models
        this.modelTiers = {
            // Fast, cheap models for simple queries
            fast: [
                'gpt-3.5-turbo',
                'gpt-4o-mini',
                'claude-3-haiku',
                'claude-3-5-haiku'
            ],
            // Mid-tier models for moderate complexity
            balanced: [
                'gpt-4',
                'gpt-4-turbo',
                'claude-3-5-sonnet',
                'claude-3-sonnet'
            ],
            // Heavy reasoning models for complex tasks
            advanced: [
                'gpt-5',
                'o1',
                'o1-mini',
                'claude-3-opus',
                'claude-3-5-opus'
            ],
            // Real-time/news models
            realtime: [
                'grok-3',
                'grok-2',
                'perplexity'
            ]
        };

        // Precompiled regex patterns for performance
        this.patterns = {
            // Simple factual questions
            factual: /\b(who|what|when|where|which|define|meaning|definition)\b/i,

            // Code-related but simple
            simpleCode: /\b(error|bug|stack|trace|fix|function|class|import|export)\b/i,

            // Heavy reasoning indicators
            reasoning: /\b(explain|architecture|analyze|design|optimize|refactor|strategy|implement|build)\b/i,

            // Complex analysis
            complex: /\b(deep analysis|complex|proposal|comprehensive|detailed analysis)\b/i,

            // Current events/news
            current: /\b(today|current|latest|news|trend|update|recent|breaking)\b/i,

            // Very simple greetings or acknowledgments
            greeting: /^(hi|hello|hey|thanks|thank you|ok|okay)$/i
        };
    }

    /**
     * Main routing function - selects optimal model based on prompt
     * @param {string} prompt - User's input prompt
     * @param {object} options - Additional options
     * @param {string[]} options.conversationHistory - Previous messages for context
     * @param {number} options.conversationTokenCount - Existing conversation tokens
     * @returns {string|null} - Selected model ID or null if should use default
     */
    selectModel(prompt, options = {}) {
        const { conversationHistory = [], conversationTokenCount = 0 } = options;

        // Estimate tokens for current prompt
        const ToolsService = require('./toolsService');
        const toolsService = new ToolsService();
        const promptTokenCount = toolsService.calculateTokenCount(prompt);
        const totalTokens = promptTokenCount + conversationTokenCount;

        const lower = prompt.toLowerCase().trim();

        console.log(`\n🤖 AUTO MODEL SELECTION:`);
        console.log(`   Prompt length: ${prompt.length} chars`);
        console.log(`   Prompt tokens: ${promptTokenCount}`);
        console.log(`   Total context tokens: ${totalTokens}`);

        // ----- FAST DECISIONS (Tier 1: Cheap Models) -----

        // 1. Very simple greeting or acknowledgment
        if (prompt.length < 20 && this.patterns.greeting.test(lower)) {
            console.log(`   ✓ Pattern: Simple greeting`);
            return this.findBestModel('fast', 'Greeting or simple acknowledgment');
        }

        // 2. Very short & factual questions
        if (promptTokenCount < 100 && this.patterns.factual.test(lower)) {
            console.log(`   ✓ Pattern: Short factual question`);
            return this.findBestModel('fast', 'Short factual query');
        }

        // 3. Simple code error or quick fix
        if (promptTokenCount < 200 && this.patterns.simpleCode.test(lower)) {
            console.log(`   ✓ Pattern: Simple code/error fix`);
            return this.findBestModel('fast', 'Simple code assistance');
        }

        // ----- CURRENT EVENTS (Special Case) -----

        // 4. Current events or real-time info
        if (this.patterns.current.test(lower)) {
            console.log(`   ✓ Pattern: Current events/news`);
            const realtimeModel = this.findBestModel('realtime', 'Real-time information');
            if (realtimeModel) {
                return realtimeModel;
            }
            // Fallback to advanced if no realtime model available
            return this.findBestModel('advanced', 'Current events (fallback)');
        }

        // ----- ADVANCED REASONING (Tier 3: Heavy Models) -----

        // 5. Very large context or complex analysis
        if (totalTokens > 800 || this.patterns.complex.test(lower)) {
            console.log(`   ✓ Pattern: Large context or complex analysis`);
            return this.findBestModel('advanced', 'Complex reasoning task');
        }

        // ----- BALANCED REASONING (Tier 2: Mid-tier Models) -----

        // 6. Moderate complexity: architecture, design, optimization
        if (promptTokenCount > 300 || this.patterns.reasoning.test(lower)) {
            console.log(`   ✓ Pattern: Moderate reasoning task`);
            return this.findBestModel('balanced', 'Moderate complexity task');
        }

        // ----- DEFAULT: BALANCED -----

        // 7. Default to balanced tier for general queries
        console.log(`   ✓ Pattern: Default to balanced`);
        return this.findBestModel('balanced', 'General purpose');
    }

    /**
     * Find the best available model from a tier
     * @param {string} tier - Model tier (fast, balanced, advanced, realtime)
     * @param {string} reason - Reason for selection (for logging)
     * @returns {string|null} - Model ID or null
     */
    findBestModel(tier, reason = '') {
        if (!this.modelTiers[tier]) {
            console.log(`   ⚠️  Unknown tier: ${tier}`);
            return null;
        }

        // Get models in this tier
        const tierModels = this.modelTiers[tier];

        // Find first available model in priority order
        for (const modelPattern of tierModels) {
            // Match by name pattern (case-insensitive, partial match)
            const matchedModel = this.availableModels.find(m => {
                const modelName = (m.name || '').toLowerCase();
                const modelLabel = (m.label || '').toLowerCase();
                const pattern = modelPattern.toLowerCase();

                return modelName.includes(pattern) ||
                       modelLabel.includes(pattern) ||
                       (m.id && String(m.id).toLowerCase() === pattern);
            });

            if (matchedModel) {
                console.log(`   ✅ Selected: ${matchedModel.name || matchedModel.id} (${tier} tier)`);
                console.log(`   📝 Reason: ${reason}\n`);
                return matchedModel.id;
            }
        }

        console.log(`   ⚠️  No ${tier} model available, will use fallback`);
        return null;
    }

    /**
     * Get fallback model if auto-selection fails
     * Uses the first balanced model, or first available model
     * @returns {string|null}
     */
    getFallbackModel() {
        // Try balanced tier first
        const balanced = this.findBestModel('balanced', 'Fallback');
        if (balanced) return balanced;

        // Use first available model as last resort
        if (this.availableModels && this.availableModels.length > 0) {
            const fallback = this.availableModels[0];
            console.log(`   ⚠️  Using first available model: ${fallback.name || fallback.id}`);
            return fallback.id;
        }

        return null;
    }

    /**
     * Check if a model ID is the "auto" selector
     * @param {string|number} modelId
     * @returns {boolean}
     */
    static isAutoModel(modelId) {
        if (!modelId) return false;
        const str = String(modelId).toLowerCase().trim();
        return str === 'auto' || str === 'auto-select' || str === '0';
    }

    /**
     * Add user feedback to improve future selections (for ML enhancement)
     * @param {string} promptSummary - Summary of the prompt
     * @param {string} selectedModel - Model that was selected
     * @param {boolean} wasGood - Whether user was satisfied
     */
    async logFeedback(promptSummary, selectedModel, wasGood) {
        // TODO: Store feedback in database for future ML training
        // For now, just log it
        console.log(`📊 Feedback: Model ${selectedModel} for "${promptSummary.substring(0, 50)}..." was ${wasGood ? 'good' : 'bad'}`);
    }
}

module.exports = ModelRouterService;
