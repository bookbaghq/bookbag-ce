const master = require('mastercontroller');

/**
 * ThinkingDetectionService
 * - Loads StartThinkingStrings rules for a model
 * - Processes streamed chunks to detect thinking sections based on start/end words
 * - Persists detected sections via MessagePersistenceService
 */
class ThinkingDetectionService {
    constructor(persistenceService, modelId, generationStartTime, aiMessageId) {
        this.persistenceService = persistenceService;
        this.modelId = modelId;
        this.generationStartTime = generationStartTime;
        this.aiMessageId = aiMessageId;


        // Public buffers mirrored to the frontend expectations
        this.rawBuffer = '';
        this.responseBuffer = '';
        this.thinkingBuffer = '';
        this.tailWindow = '';

        // Rule state
        this.sectionCounter = 0;
        this.thinkingRules = [];
        this._hasStartRules = false;
        this._hasPureEndOnlyRules = false;
        this.endOnlyBuffer = '';
        this.startOnlyBuffer = '';
        this._thinkStreaming = false;
        this._lastThinkingStart = null;
        this._lastThinkingEnd = null;
    }

    _escapeRegExp(value) {
        try { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); } catch (_) { return String(value || ''); }
    }

    _containsWholeWord(haystack, needle) {
        if (!haystack || !needle) return false;
        const escaped = this._escapeRegExp(needle);
        // Use word boundaries so 'the' does not match 'there'
        const re = new RegExp(`\\b${escaped}\\b`, 'i');
        return re.test(haystack);
    }

    loadRules() {
        try {
            const modelCtx = require(`${master.root}/components/models/app/models/modelContext`);
            const mctx = new modelCtx();
            const rows = mctx.StartThinkingStrings.where(r => r.model_id == $$, parseInt(this.modelId, 10)).toList();
            this.thinkingRules = rows.map(r => ({ startWord: r.start_word || '', endWord: r.end_word || '' }));
        } catch (_) {
            this.thinkingRules = [];
        }
        this._hasStartRules = this.thinkingRules.some(r => !!(r.startWord && String(r.startWord).length > 0));
        this._hasPureEndOnlyRules = this.thinkingRules.some(r => !(r.startWord && String(r.startWord).length > 0) && !!(r.endWord && String(r.endWord).length > 0));
        return this.thinkingRules;
    }


    checkForStartRules(chunk) {
        if (!this._hasStartRules) return false;
        if (!chunk || typeof chunk !== 'string') return false;
        // True if any rule has a non-empty startWord that appears in chunk as a whole word
        for (const r of this.thinkingRules) {
            const start = (r && r.startWord) ? String(r.startWord) : '';
            if (start && this._containsWholeWord(chunk, start)) return true;
        }
        return false;
    }
    
    checkForEndOnlyRules(chunk) {
        if (!this._hasPureEndOnlyRules) return false;
        if (!chunk || typeof chunk !== 'string') return false;
        // True if any rule WITHOUT startWord but WITH endWord appears in chunk as a whole word
        for (const r of this.thinkingRules) {
            const hasStart = !!(r && r.startWord && String(r.startWord).length > 0);
            const end = (r && r.endWord) ? String(r.endWord) : '';
            if (!hasStart && end && this._containsWholeWord(chunk, end)) return true;
        }
        return false;
    }

    async processChunk(chunk) {
    
        if (!chunk || typeof chunk !== 'string') return { rawBuffer: this.rawBuffer, thinkingBuffer: this.thinkingBuffer, responseBuffer: this.responseBuffer, tailWindow: this.tailWindow };

        // Append to raw and tail window
        this.rawBuffer += chunk;
        this.tailWindow += chunk;
        
        if (this.tailWindow.length > 128) {
            this.tailWindow = this.tailWindow.slice(-128);
        }
        this.responseBuffer += chunk;
        // If no rules loaded, everything is display content
        if (!this.thinkingRules || this.thinkingRules.length === 0) {
            return { rawBuffer: this.rawBuffer, thinkingBuffer: this.thinkingBuffer, responseBuffer: this.responseBuffer, tailWindow: this.tailWindow };
        }

        // Pure end-only mode: capture everything until an end word, then persist and clear display buffer
        if (!this._hasStartRules && this._hasPureEndOnlyRules) {
            // Initialize raw-based consumed pointer on first use
            if (typeof this._endOnlyRawIndex !== 'number') this._endOnlyRawIndex = 0;
            
            this.thinkingBuffer = "";

            // in the start end
            if(this.checkForStartRules(this.responseBuffer)) {
                this.thinkingBuffer = this.responseBuffer;
                this.responseBuffer = "";
                try {
                    const startTime = this.generationStartTime;
                    const endTime = Date.now();
                    await this.persistenceService.saveThinkingSection(
                        this.aiMessageId,
                        this.sectionCounter++,
                        this.thinkingBuffer,
                        startTime,
                        endTime,
                        0
                    );
                    this._lastThinkingStart = startTime;
                    this._lastThinkingEnd = endTime;
                } catch (_) {}
            }

            if(this.checkForEndOnlyRules(this.responseBuffer)) {
                this.thinkingBuffer = this.responseBuffer;
                this.responseBuffer = "";
                // save to db thinking
                try {
                    const startTime = this.generationStartTime;
                    const endTime = Date.now();
                    await this.persistenceService.saveThinkingSection(
                        this.aiMessageId,
                        this.sectionCounter++,
                        this.thinkingBuffer,
                        startTime,
                        endTime,
                        0
                        );
                    this._lastThinkingStart = startTime;
                    this._lastThinkingEnd = endTime;
                } catch (_) {}
            }
            

            return { rawBuffer: this.rawBuffer, thinkingBuffer: this.thinkingBuffer, responseBuffer: this.responseBuffer, tailWindow: this.tailWindow, thinkingStartTime: this._lastThinkingStart, thinkingEndTime: this._lastThinkingEnd };
        }
        return { rawBuffer: this.rawBuffer, thinkingBuffer: this.thinkingBuffer, responseBuffer: this.responseBuffer, tailWindow: this.tailWindow, thinkingStartTime: this._lastThinkingStart, thinkingEndTime: this._lastThinkingEnd };
    }

    getDetectedSectionsCount() {
        return this.sectionCounter || 0;
    }
}

module.exports = ThinkingDetectionService;



