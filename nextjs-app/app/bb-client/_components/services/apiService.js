/**
 * API Service for Chat Interface
 * Handles all backend API calls and data persistence
 */

/**
 * API Service class to handle backend communication
 */
import api from '@/apiConfig.json'

export class ApiService {
  constructor() {
    // Always use apiConfig.json
    this.baseUrl = api.ApiConfig.main;
    this.socket = null;
  }

  /**
   * Get chat by ID from backend (includes messages with server-calculated TPS)
   * @param {string|number} chatId
   * @returns {Promise<object>} - { success, chat }
   */
  async getChatById(chatId) {
    const response = await fetch(`${this.baseUrl}/bb-chat/api/chat/${chatId}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to load chat ${chatId}: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Save TPS (Tokens Per Second) to database
   * @param {string} messageId - Message ID
   * @param {number} tps - Tokens per second value
   * @returns {Promise<boolean>} - Success status
   */
  async saveTpsToDatabase() {
    throw new Error('saveTpsToDatabase is deprecated; TPS is computed on the server.');
  }

  /**
   * Delete a chat by ID
   * @param {string} chatId - Chat ID to delete
   * @returns {Promise<object>} - Result object with success status
   */
  async deleteChat(chatId) {
    try {
      console.log('Deleting chat:', chatId);
      
      const response = await fetch(`${this.baseUrl}/bb-chat/api/chat/${chatId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Chat deleted successfully');
          return { success: true };
        } else {
          console.error('❌ Delete failed:', data.error);
          return { success: false, error: data.error };
        }
      } else {
        console.error('❌ Delete request failed:', response.status, response.statusText);
        return { success: false, error: 'Failed to delete chat. Please try again.' };
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      return { success: false, error: 'Failed to delete chat. Please try again.' };
    }
  }

  /**
   * Archive a chat by ID
   * @param {string} chatId - Chat ID to archive
   * @returns {Promise<object>} - Result object with success status
   */
  async archiveChat(chatId) {
    try {
      console.log('Archiving chat:', chatId);
      
      const response = await fetch(`${this.baseUrl}/bb-chat/api/chat/${chatId}/archive`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Chat archived successfully');
          return { success: true };
        } else {
          console.error('❌ Archive failed:', data.error);
          return { success: false, error: data.error };
        }
      } else {
        console.error('❌ Archive request failed:', response.status, response.statusText);
        return { success: false, error: 'Failed to archive chat. Please try again.' };
      }
    } catch (error) {
      console.error('Error archiving chat:', error);
      return { success: false, error: 'Failed to archive chat. Please try again.' };
    }
  }

  /**
   * Create user message in database first (DB-first approach)
   * @param {string} content - Message content
   * @param {string|null} chatId - Chat ID or null for new chat
   * @param {string} modelId - Model ID
   * @param {Array<string>} attachments - Optional array of image URLs
   * @returns {Promise<object>} - User message with real ID
   */
  async createUserMessage(content, chatId, modelId, attachments) {
    try {
      const payload = {
        content: content,
        chatId: chatId,
        modelId: modelId
      };

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      const response = await fetch(`${this.baseUrl}/bb-chat/api/message/createuser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create user message');
      }

      // Return both user message and optional aiMessage when provided
      return data;
    } catch (error) {
      console.error('❌ Error creating user message:', error);
      throw error;
    }
  }

  /**
   * Start AI streaming response with real message IDs
   * @param {string} aiMessageId - Real AI message ID
   * @param {string} userMessageId - Real user message ID  
   * @param {string} modelId - Selected model ID
   * @param {object} options - Additional options
   * @returns {Promise<Response>} - Fetch response object
   */
  async startAIStreamingResponse(_aiMessageIdIgnored, userMessageId, modelId, options = {}) {
    try {
      const requestData = {
        chatId: options.chatId || null,
        userMessageId: userMessageId,
        modelId: modelId,
        noThinking: options.noThinking || false,
        // autoTrim removed; server decides via model.auto_trim_on
      };
      // WebSocket path (OpenAI-compatible only)
      const { io } = await import('socket.io-client');
      if (!this.socket || this.socket.disconnected) {
        this.socket = io(this.baseUrl, {
          query: 'socket=chat',
          withCredentials: true,
          // Allow polling fallback to avoid early close during upgrade issues
          // and retry a few times if backend restarts
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 500,
          timeout: 10000,
          path: '/socket.io'
        });
      }

      // Wrap socket stream in a readable stream to reuse existing parsing
      const stream = new ReadableStream({
        start: (controller) => {
          const encoder = new TextEncoder();

          const onStream = (evt) => {
            try {
              // Reuse SSE parser upstream by emitting data: JSON\n\n frames
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
              if (evt && evt.type === 'aiChunk' && evt.chunk === '__STREAM_END__') {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              }
            } catch (_) {}
          };
          const onEnd = () => {
            try { controller.enqueue(encoder.encode(`data: [DONE]\n\n`)); } catch (_) {}
            try { controller.close(); } catch (_) {}
          };
          const onError = (err) => {
            try { controller.error(err || new Error('socket error')); } catch (_) {}
          };

          this.socket.on('chat:stream', onStream);
          this.socket.on('chat:stream:end', onEnd);
          this.socket.on('disconnect', onEnd);
          this.socket.on('error', onError);

          // Start
          this.socket.emit('start', requestData);

          // Abort support
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              try { this.socket.emit('chat:cancel'); } catch (_) {}
              try { controller.enqueue(encoder.encode(`data: [DONE]\n\n`)); } catch (_) {}
              try { controller.close(); } catch (_) {}
            }, { once: true });
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } catch (error) {
      console.error('❌ Error starting AI streaming:', error);
      throw error;
    }
  }

  /**
   * Send a streaming message to the backend (legacy method)
   * @param {object} requestData - Request payload
   * @returns {Promise<Response>} - Fetch response object
   */
  async sendStreamingMessage(requestData) {
    const response = await fetch(`${this.baseUrl}/bb-chat/api/message/sendUserStreaming`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestData),
      credentials: 'include',
      signal: requestData.signal // AbortController signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  /**
   * Save streaming response content to backend
   * @param {string|number} messageId
   * @param {string} content
   * @param {number} tokenCount
   * @param {number} tps
   * @param {number} generationStartTime
   * @param {number} lastUpdateTime
   */
  async saveStreamingResponse(messageId, content, tokenCount = 0, tps = 0, generationStartTime = Date.now(), lastUpdateTime = 0) {
    const payload = {
      messageId,
      content,
      tokenCount,
      tps,
      generationStartTime,
      lastUpdateTime
    };
    const response = await fetch(`${this.baseUrl}/bb-chat/api/message/updateStreamingContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to save streaming content: ${response.status}`);
    }
    return response.json();
  }
}

/**
 * Clipboard utilities for copying content
 */
export class ClipboardService {
  /**
   * Enhanced copy function with fallback for insecure contexts
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} - Success status
   */
  static async copyToClipboard(text) {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback to legacy method
        return this.fallbackCopyToClipboard(text);
      }
    } catch (err) {
      console.error('Clipboard API failed, trying fallback:', err);
      return this.fallbackCopyToClipboard(text);
    }
  }

  /**
   * Legacy fallback copy method
   * @param {string} text - Text to copy
   * @returns {boolean} - Success status
   */
  static fallbackCopyToClipboard(text) {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      // Try to copy using execCommand
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();
