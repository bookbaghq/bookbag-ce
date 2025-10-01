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
        
        // If no rules loaded, everything is display content
        if (!this.thinkingRules || this.thinkingRules.length === 0) {
            this.responseBuffer += chunk;
            return { rawBuffer: this.rawBuffer, thinkingBuffer: this.thinkingBuffer, responseBuffer: this.responseBuffer, tailWindow: this.tailWindow };
        }

        // Initialize state tracking
        if (typeof this._pendingBuffer !== 'string') this._pendingBuffer = '';
        
        // Add chunk to pending buffer
        this._pendingBuffer += chunk;
        
        // For immediate streaming: if pending buffer is small and has no trigger yet, 
        // flush older content to response while keeping a tail for trigger detection
        if (this._pendingBuffer.length > 100 && !this.checkForEndOnlyRules(this._pendingBuffer)) {
            // Keep last 50 chars in pending (in case a trigger spans chunks), flush the rest
            const toFlush = this._pendingBuffer.slice(0, -50);
            this._pendingBuffer = this._pendingBuffer.slice(-50);
            this.responseBuffer += toFlush;
        }

        // Check if pending buffer contains an end trigger
        const hasEndTrigger = this.checkForEndOnlyRules(this._pendingBuffer);
        
        // Track if we completed a thinking section in THIS chunk
        let justCompletedThinking = false;
        
        if (hasEndTrigger) {
            // Found an end trigger - extract content UP TO AND INCLUDING the trigger word
            // Find the position of the trigger word to split properly
            let splitPoint = this._pendingBuffer.length;
            
            // Find the actual trigger word position
            for (const r of this.thinkingRules) {
                const hasStart = !!(r && r.startWord && String(r.startWord).length > 0);
                const endWord = (r && r.endWord) ? String(r.endWord) : '';
                if (!hasStart && endWord) {
                    // This is an end-only rule - find where it appears
                    const escaped = this._escapeRegExp(endWord);
                    const re = new RegExp(`\\b${escaped}\\b`, 'i');
                    const match = re.exec(this._pendingBuffer);
                    if (match) {
                        // Split after the end of the match
                        splitPoint = Math.min(splitPoint, match.index + match[0].length);
                    }
                }
            }
            
            // Extract thinking content (everything up to splitPoint)
            const thinkingContent = this._pendingBuffer.slice(0, splitPoint);
            const remainingContent = this._pendingBuffer.slice(splitPoint);
            
            // Accumulate in global thinking buffer
            this.thinkingBuffer += thinkingContent;
            
            // Persist to database (only if we haven't saved this content yet)
            const currentSectionId = this.sectionCounter;
            const shouldSave = this._lastSavedSection !== currentSectionId;
            
            console.log('[THINKING TRIGGER]', {
                sectionId: currentSectionId,
                lastSaved: this._lastSavedSection,
                shouldSave,
                contentLength: thinkingContent.length,
                pendingLength: this._pendingBuffer.length
            });
            
            if (shouldSave) {
                try {
                    const startTime = this.generationStartTime;
                    const endTime = Date.now();
                    console.log('[THINKING SAVE]', {
                        messageId: this.aiMessageId,
                        sectionId: this.sectionCounter,
                        content: thinkingContent.slice(0, 80) + (thinkingContent.length > 80 ? '...' : ''),
                        contentLength: thinkingContent.length,
                        splitPoint
                    });
                    
                    this._lastSavedSection = currentSectionId;
                    
                    await this.persistenceService.saveThinkingSection(
                        this.aiMessageId,
                        this.sectionCounter,
                        thinkingContent,
                        startTime,
                        endTime,
                        0
                    );
                    this._lastThinkingStart = startTime;
                    this._lastThinkingEnd = endTime;
                    this.sectionCounter++;
                    justCompletedThinking = true;
                } catch (e) {
                    console.error('[THINKING PERSIST ERROR]', e);
                }
            } else {
                // Skip save but still increment counter to avoid processing same section again
                console.log('[THINKING SKIP DUPLICATE]', { sectionId: currentSectionId });
                this.sectionCounter++;
            }
            
            // Clear pending buffer, put remaining content in response buffer
            this._pendingBuffer = '';
            if (remainingContent) {
                this.responseBuffer += remainingContent;
            }
            
        } else if (this._pendingBuffer.length > 500) {
            // Buffer getting large without trigger - flush to response as normal content
            this.responseBuffer += this._pendingBuffer;
            this._pendingBuffer = '';
        }

        // Only return thinkingEndTime if we JUST completed a thinking section in this chunk
        return { 
            rawBuffer: this.rawBuffer, 
            thinkingBuffer: this.thinkingBuffer, 
            responseBuffer: this.responseBuffer, 
            tailWindow: this.tailWindow, 
            thinkingStartTime: this._lastThinkingStart, 
            thinkingEndTime: justCompletedThinking ? this._lastThinkingEnd : null 
        };
    }

    getDetectedSectionsCount() {
        return this.sectionCounter || 0;
    }
}

module.exports = ThinkingDetectionService;



