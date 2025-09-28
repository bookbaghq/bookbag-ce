const master = require('mastercontroller');

/**
 * StreamingService - Handles Server-Sent Events (SSE) streaming operations
 * Responsibilities:
 * - SSE connection setup and management
 * - CORS headers handling
 * - Stream state management
 * - Client disconnect handling
 */
class StreamingService {
    constructor() {
        // Prevent multiple instances - use singleton pattern
        if (StreamingService.instance) {
            return StreamingService.instance;
        }
        
        this.activeStreams = new Map();
        
        // Store the singleton instance
        StreamingService.instance = this;
    }

    /**
     * Initialize SSE connection with proper headers
     * FIXED: Enhanced error handling and prevention of duplicate initialization
     */
    initializeSSEConnection(obj) {
        const res = obj.response;
        const origin = obj.request.headers.origin || '*';

        // ✅ ENHANCED: Check if SSE is already initialized
        if (res._sseInitialized) {
            console.log("SSE connection already initialized, reusing existing connection");
            return res;
        }

        // Check if headers have already been sent
        if (res.headersSent) {
            console.error("Cannot initialize SSE - headers already sent");
            return null;
        }

        // Check if response is already finished
        if (res.finished) {
            console.error("Cannot initialize SSE - response already finished");
            return null;
        }

        // Check if response is writeable
        if (!res.writable) {
            console.error("Cannot initialize SSE - response not writable");
            return null;
        }

        // Additional safety check for destroyed socket
        if (res.destroyed || (res.socket && res.socket.destroyed)) {
            console.error("Cannot initialize SSE - response/socket destroyed");
            return null;
        }

        // ✅ ENHANCED: Additional checks for response state
        if (res._streaming || res._handled) {
            console.log("Response already being handled for streaming, reusing connection");
            if (!res._sseInitialized) {
                // Mark as SSE initialized even if headers were set elsewhere
                res._sseInitialized = true;
            }
            return res;
        }

        try {
            // Set SSE headers with error handling
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
                'retry': '3000'
            });

            // Flush headers immediately to establish connection
            if (res.flushHeaders) {
                res.flushHeaders();
            }

            // Mark as SSE initialized to prevent double initialization
            res._sseInitialized = true;
            res._streaming = true;
            
            console.log("✅ SSE connection initialized successfully");
            return res;
        } catch (error) {
            console.error("❌ Error setting SSE headers:", error);
            return null;
        }
    }

    /**
     * Handle OPTIONS preflight requests
     */
    handleCORSPreflight(obj) {
        const res = obj.response;
        
        // Check if headers have already been sent
        if (res.headersSent || res.finished) {
            console.error("Cannot handle CORS preflight - response already processed");
            return;
        }

        try {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            });
            res.end();
        } catch (error) {
            console.error("Error handling CORS preflight:", error);
        }
    }

    /**
     * Send SSE event to client with enhanced safety
     */
    sendEvent(res, eventData) {
        // Support both SSE (HTTP response) and WebSocket (socket.io) targets
        try {
            // Socket-like target detection
            const isSocket = res && typeof res.emit === 'function' && typeof res.on === 'function';
            if (isSocket) {
                // Emit a unified channel; frontend differentiates by payload.type
                res.emit('chat:stream', eventData);
                return true;
            }

            // ✅ Enhanced safety checks to prevent "response finished" errors for SSE
            if (res && !res.finished && res.writable && !res.writableEnded) {
                try {
                    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
                    if (res.flush) res.flush();
                    return true;
                } catch (error) {
                    console.error("Error sending SSE event:", error);
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error("Error in sendEvent:", error);
            return false;
        }
    }

    /**
     * Send connection established event
     */
    sendConnectionEstablished(res, modelName) {
        return this.sendEvent(res, {
            type: 'connected',
            message: 'Stream connection established',
            model: modelName
        });
    }

    /**
     * Send user message confirmation
     */
    sendUserMessage(res, chatId, userMessage) {
        return this.sendEvent(res, {
            type: 'userMessage',
            chatId: chatId,
            message: {
                id: userMessage.id,
                role: "user",
                content: userMessage.content,
                token_count: userMessage.token_count,
                created_at: userMessage.created_at
            }
        });
    }

    /**
     * Send AI message created event
     * FIXED: Use correct event type that frontend expects
     */
    sendAIMessageCreated(res, aiMessageId) {
        return this.sendEvent(res, {
            type: 'aiMessageCreated', // ✅ FIXED: Changed from 'aiMessageStart' to match frontend expectations
            messageId: aiMessageId,
            realMessageId: aiMessageId,
            tempMessageId: `ai-${Date.now()}`
        });
    }

    /**
     * Send AI chunk during streaming
     */
    sendAIChunk(res, token, messageId = null, fullText = '', tps = null, tokenCount = null, extraFields = null) {
        const payload = {
            type: 'aiChunk',
            messageId: messageId,
            // chunk and fullText intentionally omitted when null
        };
        if (token != null) payload.chunk = token;
        if (fullText != null) payload.fullText = fullText;
        if (typeof tps === 'number') payload.tps = tps;
        if (typeof tokenCount === 'number') payload.tokenCount = tokenCount;
        if (extraFields && typeof extraFields === 'object') {
            // Merge additional fields for client-side processing
            Object.assign(payload, extraFields);
        }
        return this.sendEvent(res, payload);
    }

    /**
     * Send AI message completion
     */
    sendAIMessageComplete(res, aiMessage, modelName) {
        return this.sendEvent(res, {
            type: 'aiMessageComplete',
            finalMessage: {
                id: aiMessage.id,
                role: "assistant",
                content: aiMessage.content,
                token_count: aiMessage.token_count,
                max_tokens: aiMessage.max_tokens,
                tokens_per_seconds: aiMessage.tokens_per_seconds,
                created_at: aiMessage.created_at,
                model: modelName
            }
        });
    }

    /**
     * Send error event
     */
    sendError(res, error, details = null, modelName = null) {
        return this.sendEvent(res, {
            type: 'error',
            error: error,
            details: details,
            model: modelName
        });
    }

    /**
     * End the stream with proper cleanup
     * FIXED: Enhanced connection closure to prevent network errors
     */
    endStream(res) {
        try {
            // Socket-like target
            const isSocket = res && typeof res.emit === 'function' && typeof res.on === 'function';
            if (isSocket) {
                try {
                    res.emit('chat:stream:end', { type: 'done' });
                } catch (_) {}
                return true;
            }

            // SSE target
            if (res && !res.finished && res.writable && !res.writableEnded) {
                try {
                    res.write(`data: [DONE]\n\n`);
                    if (res.flush) { res.flush(); }
                    res.end();
                    console.log("✅ Stream ended successfully with [DONE] signal");
                    return true;
                } catch (error) {
                    console.error("❌ Error ending stream:", error);
                    if (error.code === 'ERR_STREAM_WRITE_AFTER_END') {
                        console.log("⚠️ Stream already ended, this is normal");
                        return true;
                    }
                    if (!res.destroyed && !res.finished) {
                        try { res.destroy(); } catch (destroyError) { console.error("❌ Error destroying response:", destroyError); }
                    }
                    return false;
                }
            } else {
                console.log("⚠️ Stream already finished, writable ended, or not writable - this is normal");
                return true;
            }
        } catch (error) {
            console.error("Error in endStream:", error);
            return false;
        }
    }

    /**
     * Send heartbeat to prevent proxy timeouts
     */
    sendHeartbeat(res) {
        try {
            // For sockets, rely on built-in ping/pong; no-op
            const isSocket = res && typeof res.emit === 'function' && typeof res.on === 'function';
            if (isSocket) {
                return true;
            }

            if (res && !res.finished && res.writable) {
                try {
                    res.write(`: heartbeat\n\n`);
                    if (res.flush) res.flush();
                    return true;
                } catch (error) {
                    console.error("Error sending heartbeat:", error);
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error("Error in sendHeartbeat:", error);
            return false;
        }
    }

    /**
     * Enhanced stream cleanup with timeout protection
     */
    cleanupStreamWithTimeout(streamId, timeout = 30000) {
        const streamInfo = this.activeStreams.get(streamId);
        if (streamInfo) {
            // Set a cleanup timeout to prevent hanging connections
            const cleanupTimeout = setTimeout(() => {
                console.log(`⏰ Force cleaning up stream ${streamId} after timeout`);
                const res = streamInfo.response;
                if (res && res.writable && !res.finished) {
                    try {
                        res.write(`data: [TIMEOUT]\n\n`);
                        res.end();
                    } catch (error) {
                        console.error("Error in force cleanup:", error);
                        try {
                            res.destroy();
                        } catch (destroyError) {
                            console.error("Error destroying in cleanup:", destroyError);
                        }
                    }
                }
                this.activeStreams.delete(streamId);
            }, timeout);

            // Store cleanup timeout for later clearing
            streamInfo.cleanupTimeout = cleanupTimeout;
        }
    }

    /**
     * Register stream with interrupt handling
     */
    registerStream(streamId, res, interruptHandler) {
        const streamInfo = {
            response: res,
            startTime: Date.now(),
            interruptHandler: interruptHandler
        };

        this.activeStreams.set(streamId, streamInfo);

        // Handle client disconnect (SSE: 'close', Socket.IO: 'disconnect')
        try {
            const isSocket = res && typeof res.on === 'function' && typeof res.emit === 'function';
            if (isSocket) {
                res.on('disconnect', () => {
                    console.log(`Stream ${streamId} disconnected by client (socket)`);
                    if (interruptHandler) { interruptHandler(); }
                    this.activeStreams.delete(streamId);
                });
                // Optional: listen for explicit cancel from client
                if (typeof res.on === 'function') {
                    res.on('chat:stream:cancel', () => {
                        console.log(`Stream ${streamId} cancel requested by client`);
                        if (interruptHandler) { interruptHandler(); }
                        this.activeStreams.delete(streamId);
                    });
                }
            } else if (res && typeof res.on === 'function') {
                res.on('close', () => {
                    console.log(`Stream ${streamId} closed by client`);
                    if (interruptHandler) { interruptHandler(); }
                    this.activeStreams.delete(streamId);
                });
            }
        } catch (e) {
            console.error('Error wiring stream disconnect handlers:', e);
        }

        return streamInfo;
    }

    /**
     * Cleanup stream
     */
    cleanupStream(streamId) {
        this.activeStreams.delete(streamId);
    }

    /**
     * Get active stream count
     */
    getActiveStreamCount() {
        return this.activeStreams.size;
    }

    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!StreamingService.instance) {
            new StreamingService();
        }
        return StreamingService.instance;
    }
}

module.exports = StreamingService;
