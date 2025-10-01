/**
 * Frontend Streaming Service - 3 Buffer System with TailWindow Approach
 * Implements thinking/response separation entirely in frontend
 */

// Backend calls are delegated via provided callbacks

export class FrontendStreamingService {
    constructor() {
        this.messageId = null;
        
        // The 3 buffers as specified
        this.thinkingBuffer = "";      // collects reasoning tokens
        this.responseBuffer = "";      // DISPLAY BUFFER - shown in UI  
        this.rawBuffer = "";           // mirror of all tokens for internal processing
        
        // TailWindow approach variables
        this.tailWindow = "";          // Last 10 chars for </think> detection
        this.startTime = null;         // Start time for thinking section timing
        this.tokenCount = 0;
        this.tps = 0;

        // Direct UI callbacks (assign directly)
        // uiCallbacks will be assigned by the owning component
        this.uiCallbacks = null;

        // Track last thinking piece to avoid duplicates
        this._lastThinkingPiece = '';

        try {
            const { uiEventBus } = require('./uiEventBus');
            this.bus = uiEventBus;
        } catch (_) {
            this.bus = null;
        }
    }

    /**
     * Initialize for a new message
     */
    initialize(messageId, callbacks = {}) {
        try { console.log('[FES] initialize', { messageId }); } catch (_) {}
        this.messageId = messageId;
        this.thinkingBuffer = "";
        this.responseBuffer = "";
        this.rawBuffer = "";
        this.tailWindow = "";
        this.startTime = null;
        this.endTime = null;
        this.tokenCount = 0;
        this.tps = 0;
        
        // Store any provided callbacks from owner (e.g., controller)
        this.uiCallbacks = callbacks || null;
        
        // Publish reset state on init
        if (this.bus) {
            this.bus.publish(this.messageId, 'reset', {});
        }

    }

    // Removed registerUICallbacks: assign this.uiCallbacks directly from the owning component
    // Adding back a lightweight registrar so existing components can integrate without changes
    registerUICallbacks(callbacks) {
        // Allow null to clear callbacks on unmount
        if (!callbacks) {
            this.uiCallbacks = null;
            return;
        }
        // Merge new callbacks with existing to allow multiple owners (controller + UI)
        this.uiCallbacks = { ...(this.uiCallbacks || {}), ...(callbacks || {}) };
    }

    /**
     * Process a single token payload with TailWindow approach
     * @param {object} streamObject - { token, tps, tokenCount }
     */
    processToken(streamObject) {

        // Accept only backend-provided structured payload; do not build tokens/content on frontend
        const tokenText = typeof streamObject.token === 'string' ? streamObject.token : '';
        this.tps = streamObject.tps;
        this.tokenCount = streamObject.tokenCount;
        const incomingMessageId = (streamObject && (streamObject.messageId !== undefined && streamObject.messageId !== null)) ? String(streamObject.messageId) : null;

        // Remap to backend-assigned message id if provided (prevents id mismatch with UI subscribers)
        if (incomingMessageId && String(this.messageId) !== incomingMessageId) {
            const previousId = this.messageId;
            this.messageId = incomingMessageId;
            try { console.log('[FES] remap messageId', { previousId, newId: this.messageId }); } catch (_) {}
            // Publish a reset for the new id and replay current buffers so UI can hydrate
            if (this.bus) {
                this.bus.publish(this.messageId, 'reset', {});
                if (this.thinkingBuffer && this.thinkingBuffer.length > 0) {
                    this.bus.publish(this.messageId, 'thinking', { content: this.thinkingBuffer, startTime: this.startTime, endTime: this.endTime });
                }
                if (this.responseBuffer && this.responseBuffer.length > 0) {
                    this.bus.publish(this.messageId, 'response', { content: this.responseBuffer });
                }
                const elapsed = this.startTime ? Math.max(0, (Date.now() - this.startTime) / 1000) : 0;
                this.bus.publish(this.messageId, 'tokens', { tokenCount: this.tokenCount ?? 0, rawLength: this.rawBuffer.length, tps: this.tps ?? null, elapsed });
            }
        }
        // Handle stream end signal
        if (tokenText === '__STREAM_END__') {
            try { console.log('[FES] end signal received - applying final buffers before finalize'); } catch (_) {}
            // Apply any final buffers (fullText/responseBuffer) from the last packet before finalizing
            try { this.watcher(streamObject); } catch (_) {}
            
            // Single, descriptive end-of-stream callback
            if (this.uiCallbacks && typeof this.uiCallbacks.onFinalizeAssistantUI === 'function') {
                this.uiCallbacks.onFinalizeAssistantUI(this.messageId);
            }
            if (this.bus) {
                this.bus.publish(this.messageId, 'finalize', {});
            }
            return this.getBufferStates();
        }
        
        
        // Step 2: Dispatch token count update immediately (UI convenience)
        this.updateTokenCountUI();
        if (this.bus) {
            const elapsed = this.startTime ? Math.max(0, (Date.now() - this.startTime) / 1000) : 0;
            this.bus.publish(this.messageId, 'tokens', { tokenCount: this.tokenCount ?? 0, rawLength: this.rawBuffer.length, tps: this.tps ?? null, elapsed });
        }
        
        // Step 3: Save start time for thinking logic
        if (!this.startTime) {
            this.startTime = Date.now();
        }
        
        // Start the workflow with passthrough buffers only
        this.initWorkflow(streamObject);

        return {
            thinking: this.thinkingBuffer,
            response: this.responseBuffer
        };
    }

    initWorkflow(streamObject){
        this.watcher(streamObject);
    }

    watcher(streamObject){
       
        if(streamObject.thinkingBuffer !== ""){
            // Accept either string or array of sections from backend
            let normalizedThinking = '';
            let sectionStartTime = null;
            let sectionEndTime = null;
            const tb = streamObject.thinkingBuffer;
            if (Array.isArray(tb)) {
                // Concatenate contents for UI while keeping array in event payload
                normalizedThinking = tb.map(s => (s && s.content) ? String(s.content) : '').join('\n\n');
                // Use the latest section's times if available
                const last = tb.length > 0 ? tb[tb.length - 1] : null;
                if (last && typeof last === 'object') {
                    sectionStartTime = typeof last.startTime === 'number' ? last.startTime : null;
                    sectionEndTime = typeof last.endTime === 'number' ? last.endTime : null;
                }
            } else if (typeof tb === 'string') {
                normalizedThinking = tb;
            } else if (tb && typeof tb === 'object' && tb.content) {
                normalizedThinking = String(tb.content);
                sectionStartTime = typeof tb.startTime === 'number' ? tb.startTime : null;
                sectionEndTime = typeof tb.endTime === 'number' ? tb.endTime : null;
            }
            this.thinkingBufferUpdate(normalizedThinking, sectionStartTime, sectionEndTime);
            try {
                console.log('[FES] thinkingBuffer update', {
                    messageId: this.messageId,
                    length: (normalizedThinking || '').length,
                    startTime: sectionStartTime,
                    endTime: sectionEndTime
                });
            } catch (_) {}
        }
        
        // Determine content to display in UI based solely on backend-provided fields
        const candidate = (typeof streamObject.fullText === 'string')
            ? streamObject.fullText
            : (typeof streamObject.responseBuffer === 'string')
                ? streamObject.responseBuffer
                : '';
        if (candidate) {
            // Only replace if we are progressing forward (avoid accidental truncation)
            if (!this.responseBuffer || candidate.length >= this.responseBuffer.length) {
                try { console.log('[FES] response candidate chosen', { messageId: this.messageId, newLen: candidate.length, prevLen: this.responseBuffer.length }); } catch (_) {}
                this.responseBufferUpdate(candidate);
            }
        }
    }

    responseBufferUpdate(stream){
          
        // set the response buffer 
        const prev = this.responseBuffer || '';
        this.responseBuffer = stream; // this is behind 8 characters
        try { console.log('[FES] responseBufferUpdate', { messageId: this.messageId, prevLen: prev.length, newLen: this.responseBuffer.length }); } catch (_) {}

        if (this.bus) {
            this.bus.publish(this.messageId, 'response', { content: this.responseBuffer });
        }
    }

    thinkingBufferUpdate(fulltext, sectionStartTime, sectionEndTime){
        // Normalize incoming piece
        const piece = (typeof fulltext === 'string') ? fulltext : '';
        if (!piece) {
            return;
        }
        // Avoid duplicate appends when the same segment is delivered repeatedly
        if (this._lastThinkingPiece === piece) {
            // still publish to keep times up to date if provided
        } else {
            this._lastThinkingPiece = piece;
            // Append new piece to existing thinking buffer with spacing
            this.thinkingBuffer = this.thinkingBuffer
                ? `${this.thinkingBuffer}\n\n${piece}`
                : piece;
        }
        // Initialize start time if not already set
        if (!this.startTime) {
            this.startTime = sectionStartTime || Date.now();
        }
        // Track latest known end time from backend (do not set to Date.now repeatedly)
        this.endTime = (typeof sectionEndTime === 'number') ? sectionEndTime : null;
        try { console.log('[FES] thinkingBufferUpdate', { messageId: this.messageId, len: (this.thinkingBuffer || '').length, startTime: this.startTime, endTime: this.endTime }); } catch (_) {}
        if (this.bus) {
            // Publish a per-segment event so UI can append a new bubble
            this.bus.publish(this.messageId, 'thinkingSegment', { content: piece, startTime: this.startTime, endTime: this.endTime });
            // Maintain backward-compatible aggregate event as well
            this.bus.publish(this.messageId, 'thinking', { content: this.thinkingBuffer, startTime: this.startTime, endTime: this.endTime });
        }
    }

    /**
     * Update token count UI using backend-provided count
     */
    updateTokenCountUI() {
        // Prefer direct UI callback only
        if (this.uiCallbacks && typeof this.uiCallbacks.onTokens === 'function') {
            this.uiCallbacks.onTokens(this.messageId, this.tokenCount ?? 0, this.rawBuffer.length);
        }
        try { console.log('[FES] tokenCount', { messageId: this.messageId, tokenCount: this.tokenCount, rawLen: this.rawBuffer.length, tps: this.tps }); } catch (_) {}
    }


    /**
     * Get current buffer states
     */
    getBufferStates() {
        return {
            thinking: this.thinkingBuffer,
            response: this.responseBuffer,
            raw: this.rawBuffer,
            tailWindow: this.tailWindow,
            tokenCount: this.tokenCount
        };
    }

}

/**
 * Factory function
 */
export function createFrontendStreamingService(messageId, callbacks) {
    const service = new FrontendStreamingService();
    service.initialize(messageId, callbacks);
    return service;
}
