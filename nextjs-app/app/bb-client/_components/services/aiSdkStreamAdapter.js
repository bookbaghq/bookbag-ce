/**
 * AI SDK Stream Adapter
 * Bridges Socket.IO streaming events to React state for enhanced AI components
 *
 * This adapter maintains your backend's Socket.IO architecture while providing
 * data in the format expected by AI SDK-inspired components.
 */
'use client';

import React from 'react';

/**
 * Creates a client-side stream adapter for AI SDK from Socket.IO events
 * This works with React state and allows AI SDK components to consume your backend's streaming format
 */
export class AISdkStreamAdapter {
  constructor() {
    this.socket = null;
    this.updateCallbacks = {
      onThinkingUpdate: null,
      onResponseUpdate: null,
      onMetadataUpdate: null,
      onSectionsUpdate: null
    };

    // Internal buffers for accumulation
    this.thinkingBuffer = '';
    this.responseBuffer = '';
    this.thinkingSections = [];

    // Thinking section tracking
    this.currentThinkingSection = null;
    this.thinkingStartTime = null;
    this.thinkingEndTime = null;

    // Stream stats
    this.tokenCount = 0;
    this.tps = 0;
    this.startTime = null;
  }

  /**
   * Initialize adapter with Socket.IO connection and update callbacks
   * @param {Socket} socket - Socket.IO client instance
   * @param {Object} callbacks - { onThinkingUpdate, onResponseUpdate, onMetadataUpdate, onSectionsUpdate }
   */
  initialize(socket, callbacks = {}) {
    this.socket = socket;
    this.updateCallbacks = { ...this.updateCallbacks, ...callbacks };
    this.reset();

    // Set up Socket.IO event listeners
    this.setupSocketListeners();
  }

  /**
   * Reset internal state for new message
   */
  reset() {
    this.thinkingBuffer = '';
    this.responseBuffer = '';
    this.thinkingSections = [];
    this.currentThinkingSection = null;
    this.thinkingStartTime = null;
    this.thinkingEndTime = null;
    this.tokenCount = 0;
    this.tps = 0;
    this.startTime = null;
  }

  /**
   * Set up Socket.IO event listeners and map to AI SDK streams
   */
  setupSocketListeners() {
    if (!this.socket) return;

    // Main streaming event from backend
    this.socket.on('chat:stream', (evt) => {
      this.handleStreamEvent(evt);
    });

    // Stream end event
    this.socket.on('chat:stream:end', () => {
      this.finalizeStreams();
    });

    // Error handling
    this.socket.on('error', (err) => {
      console.error('❌ Socket.IO stream error:', err);
      this.finalizeStreams();
    });

    // Disconnect handling
    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.finalizeStreams();
    });
  }

  /**
   * Handle incoming stream events from Socket.IO
   * Maps backend format to AI SDK streamable values
   */
  handleStreamEvent(evt) {
    try {
      // Parse event based on your backend's format
      const eventData = typeof evt === 'string' ? JSON.parse(evt) : evt;

      // Extract data from event
      const {
        type,
        chunk,
        token,
        thinkingBuffer,
        responseBuffer,
        fullText,
        messageId,
        tokenCount,
        tps
      } = eventData;

      // Update metadata
      if (tokenCount !== undefined) this.tokenCount = tokenCount;
      if (tps !== undefined) this.tps = tps;
      if (!this.startTime) this.startTime = Date.now();

      // Handle stream end
      if (chunk === '__STREAM_END__' || token === '__STREAM_END__') {
        this.finalizeStreams();
        return;
      }

      // Process thinking content
      if (thinkingBuffer !== undefined && thinkingBuffer !== null) {
        this.processThinkingBuffer(thinkingBuffer);
      }

      // Process response content
      if (responseBuffer !== undefined && responseBuffer !== null) {
        this.processResponseBuffer(responseBuffer);
      } else if (fullText !== undefined && fullText !== null) {
        this.processResponseBuffer(fullText);
      } else if (token && type === 'aiChunk') {
        // Individual token streaming
        this.responseBuffer += token;
        if (this.updateCallbacks.onResponseUpdate) {
          this.updateCallbacks.onResponseUpdate(this.responseBuffer);
        }
      }

      // Update metadata via callback
      const elapsed = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
      if (this.updateCallbacks.onMetadataUpdate) {
        this.updateCallbacks.onMetadataUpdate({
          tokenCount: this.tokenCount,
          tps: this.tps,
          elapsed
        });
      }

    } catch (error) {
      console.error('❌ Error processing stream event:', error);
    }
  }

  /**
   * Process thinking buffer updates from backend
   * Handles string, object, or array formats
   */
  processThinkingBuffer(thinkingBuffer) {
    let normalizedThinking = '';
    let sectionStartTime = null;
    let sectionEndTime = null;

    // Handle different thinking buffer formats from backend
    if (Array.isArray(thinkingBuffer)) {
      // Array of thinking sections
      this.thinkingSections = thinkingBuffer.map(section => ({
        content: section.content || '',
        startTime: section.startTime || section.start_time || null,
        endTime: section.endTime || section.end_time || null
      }));

      // Concatenate for display
      normalizedThinking = this.thinkingSections
        .map(s => s.content)
        .filter(Boolean)
        .join('\n\n');

      // Use latest section's timing
      const lastSection = this.thinkingSections[this.thinkingSections.length - 1];
      if (lastSection) {
        sectionStartTime = lastSection.startTime;
        sectionEndTime = lastSection.endTime;
      }
    } else if (typeof thinkingBuffer === 'string') {
      normalizedThinking = thinkingBuffer;
    } else if (thinkingBuffer && typeof thinkingBuffer === 'object' && thinkingBuffer.content) {
      normalizedThinking = thinkingBuffer.content;
      sectionStartTime = thinkingBuffer.startTime || thinkingBuffer.start_time;
      sectionEndTime = thinkingBuffer.endTime || thinkingBuffer.end_time;

      // Add to sections array if not already there
      if (!this.thinkingSections.some(s => s.content === normalizedThinking)) {
        this.thinkingSections.push({
          content: normalizedThinking,
          startTime: sectionStartTime,
          endTime: sectionEndTime
        });
      }
    }

    // Update thinking buffer and notify via callbacks
    if (normalizedThinking) {
      this.thinkingBuffer = normalizedThinking;

      // Track timing
      if (sectionStartTime) this.thinkingStartTime = sectionStartTime;
      if (sectionEndTime) this.thinkingEndTime = sectionEndTime;

      // Notify via callbacks
      if (this.updateCallbacks.onThinkingUpdate) {
        this.updateCallbacks.onThinkingUpdate(this.thinkingBuffer);
      }
      if (this.updateCallbacks.onSectionsUpdate) {
        this.updateCallbacks.onSectionsUpdate(this.thinkingSections);
      }
    }
  }

  /**
   * Process response buffer updates from backend
   */
  processResponseBuffer(responseBuffer) {
    if (typeof responseBuffer === 'string') {
      this.responseBuffer = responseBuffer;

      // Notify via callback
      if (this.updateCallbacks.onResponseUpdate) {
        this.updateCallbacks.onResponseUpdate(this.responseBuffer);
      }
    }
  }

  /**
   * Finalize all streams when streaming completes
   */
  finalizeStreams() {
    try {
      console.log('✅ Stream finalized', {
        thinking: this.thinkingSections.length + ' sections',
        response: this.responseBuffer.length + ' chars',
        tokens: this.tokenCount
      });

      // Final updates via callbacks
      if (this.updateCallbacks.onThinkingUpdate) {
        this.updateCallbacks.onThinkingUpdate(this.thinkingBuffer);
      }
      if (this.updateCallbacks.onResponseUpdate) {
        this.updateCallbacks.onResponseUpdate(this.responseBuffer);
      }
      if (this.updateCallbacks.onSectionsUpdate) {
        this.updateCallbacks.onSectionsUpdate(this.thinkingSections);
      }
    } catch (error) {
      console.error('❌ Error finalizing streams:', error);
    }
  }

  /**
   * Cleanup and remove listeners
   */
  cleanup() {
    if (this.socket) {
      this.socket.off('chat:stream');
      this.socket.off('chat:stream:end');
      this.socket.off('error');
      this.socket.off('disconnect');
    }
    this.reset();
  }

  /**
   * Get current stream states (for debugging)
   */
  getStreamStates() {
    return {
      thinkingBuffer: this.thinkingBuffer,
      responseBuffer: this.responseBuffer,
      thinkingSections: this.thinkingSections,
      tokenCount: this.tokenCount,
      tps: this.tps
    };
  }
}

/**
 * Hook to use AI SDK Stream Adapter in React components
 * Simplifies integration with your existing ChatController
 */
export function useAISdkStreamAdapter() {
  const adapterRef = React.useRef(null);

  React.useEffect(() => {
    // Initialize adapter on mount
    if (!adapterRef.current) {
      adapterRef.current = new AISdkStreamAdapter();
    }

    // Cleanup on unmount
    return () => {
      if (adapterRef.current) {
        adapterRef.current.cleanup();
      }
    };
  }, []);

  return adapterRef.current;
}

export default AISdkStreamAdapter;
