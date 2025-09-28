const master = require('mastercontroller');

/**
 * ToolsService - Handles utility functions and tools
 * Responsibilities:
 * - Token counting and estimation
 * - Text processing utilities
 * - General utility functions for chat operations
 */
class ToolsService {
    constructor() {
        // Configuration for token estimation
        this.avgCharsPerToken = 4; // Average characters per token (rough estimation)
    }

    /**
     * Calculate token count from text
     * Uses a rough estimation based on character count
     * @param {string} text - The text to calculate tokens for
     * @returns {number} - Estimated token count
     */
    calculateTokenCount(text) {
        // Support arrays of messages or role-content objects
        if (Array.isArray(text)) {
            let total = 0;
            for (const item of text) {
                if (!item) continue;
                if (typeof item === 'string') {
                    total += Math.ceil(item.length / this.avgCharsPerToken);
                } else if (typeof item === 'object' && typeof item.content === 'string') {
                    total += Math.ceil(item.content.length / this.avgCharsPerToken);
                }
            }
            return total;
        }
        if (text && typeof text === 'object' && typeof text.content === 'string') {
            return Math.ceil(text.content.length / this.avgCharsPerToken);
        }
        if (!text || typeof text !== 'string') {
            return 0;
        }
        return Math.ceil(text.length / this.avgCharsPerToken);
    }

    /**
     * Calculate token count with formatting overhead
     * Includes additional tokens for role formatting, tags, etc.
     * @param {string} text - The text content
     * @param {string} role - The message role (user, assistant, system)
     * @returns {number} - Estimated token count with overhead
     */
    calculateTokenCountWithOverhead(text, role = 'user') {
        const baseTokens = this.calculateTokenCount(text);
        
        // Add formatting overhead based on role
        let formattingOverhead = 5; // Base overhead for any message
        
        switch (role) {
            case 'user':
                formattingOverhead = 10; // User role tags and formatting
                break;
            case 'assistant':
                formattingOverhead = 15; // Assistant role tags and more complex formatting
                break;
            case 'system':
                formattingOverhead = 8; // System role tags
                break;
            default:
                formattingOverhead = 5;
        }
        
        return baseTokens + formattingOverhead;
    }

    /**
     * Estimate tokens for a conversation history
     * @param {Array} messageHistory - Array of message objects with role and content
     * @returns {Object} - Token estimation breakdown
     */
    estimateConversationTokens(messageHistory) {
        if (!Array.isArray(messageHistory)) {
            return { totalTokens: 0, breakdown: [] };
        }

        const breakdown = messageHistory.map((message, index) => {
            const contentTokens = this.calculateTokenCount(message.content || '');
            const totalTokens = this.calculateTokenCountWithOverhead(message.content || '', message.role);
            
            return {
                index,
                role: message.role,
                contentLength: (message.content || '').length,
                contentTokens,
                formattingTokens: totalTokens - contentTokens,
                totalTokens
            };
        });

        const totalTokens = breakdown.reduce((sum, msg) => sum + msg.totalTokens, 0);

        return {
            totalTokens,
            messageCount: messageHistory.length,
            breakdown
        };
    }

    /**
     * Truncate text to fit within a token limit
     * @param {string} text - The text to truncate
     * @param {number} maxTokens - Maximum tokens allowed
     * @param {string} suffix - Suffix to add if truncated (default: '...')
     * @returns {Object} - Result with truncated text and metadata
     */
    truncateTextByTokens(text, maxTokens, suffix = '...') {
        if (!text || typeof text !== 'string') {
            return {
                text: '',
                truncated: false,
                originalTokens: 0,
                finalTokens: 0
            };
        }

        const originalTokens = this.calculateTokenCount(text);
        
        if (originalTokens <= maxTokens) {
            return {
                text,
                truncated: false,
                originalTokens,
                finalTokens: originalTokens
            };
        }

        // Estimate how many characters to keep
        const maxChars = Math.floor(maxTokens * this.avgCharsPerToken);
        const suffixTokens = this.calculateTokenCount(suffix);
        const availableTokensForContent = maxTokens - suffixTokens;
        const availableCharsForContent = Math.floor(availableTokensForContent * this.avgCharsPerToken);
        
        if (availableCharsForContent <= 0) {
            return {
                text: suffix.substring(0, maxChars),
                truncated: true,
                originalTokens,
                finalTokens: this.calculateTokenCount(suffix.substring(0, maxChars))
            };
        }

        const truncatedText = text.substring(0, availableCharsForContent) + suffix;
        const finalTokens = this.calculateTokenCount(truncatedText);

        return {
            text: truncatedText,
            truncated: true,
            originalTokens,
            finalTokens
        };
    }

    /**
     * Generate a random session ID
     * @param {number} length - Length of the hex string (default: 32)
     * @returns {string} - Random hex string
     */
    generateSessionId(length = 32) {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Validate message content
     * @param {string} content - Message content to validate
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result
     */
    validateMessageContent(content, options = {}) {
        const {
            maxLength = 50000,
            maxTokens = 12000,
            allowEmpty = false
        } = options;

        const result = {
            valid: true,
            errors: [],
            warnings: [],
            stats: {
                length: 0,
                tokens: 0
            }
        };

        if (!content) {
            if (!allowEmpty) {
                result.valid = false;
                result.errors.push('Message content is required');
            }
            return result;
        }

        if (typeof content !== 'string') {
            result.valid = false;
            result.errors.push('Message content must be a string');
            return result;
        }

        result.stats.length = content.length;
        result.stats.tokens = this.calculateTokenCount(content);

        // Check length limits
        if (content.length > maxLength) {
            result.valid = false;
            result.errors.push(`Message too long: ${content.length} characters (max: ${maxLength})`);
        }

        // Check token limits
        if (result.stats.tokens > maxTokens) {
            result.valid = false;
            result.errors.push(`Message too long: ${result.stats.tokens} tokens (max: ${maxTokens})`);
        }

        // Warnings for large messages
        if (content.length > maxLength * 0.8) {
            result.warnings.push('Message is close to length limit');
        }

        if (result.stats.tokens > maxTokens * 0.8) {
            result.warnings.push('Message is close to token limit');
        }

        return result;
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} - Formatted size string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format duration in human readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} - Formatted duration string
     */
    formatDuration(milliseconds) {
        if (milliseconds < 1000) {
            return `${milliseconds}ms`;
        }
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Deep clone an object (simple implementation)
     * @param {*} obj - Object to clone
     * @returns {*} - Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== "object") {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === "object") {
            const clonedObj = {};
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
        
        return obj;
    }

    /**
     * Normalize model settings: coerce string values to the proper types (numbers, arrays, booleans)
     * - Converts numeric-looking strings to numbers (ints/floats)
     * - Parses JSON-like arrays (e.g., '["<user>", "<assistant>"]') for stop strings
     * - Normalizes aliases/typos (e.g., summerize_token_count -> summarize_token_count)
     * - Keeps unknown keys as-is
     * @param {object} settings
     * @returns {object} normalized copy
     */
    normalizeModelSettings(settings) {
        const src = (settings && typeof settings === 'object') ? { ...settings } : {};

        // Alias normalization
        if (Object.prototype.hasOwnProperty.call(src, 'summerize_token_count') && !Object.prototype.hasOwnProperty.call(src, 'summarize_token_count')) {
            src.summarize_token_count = src.summerize_token_count;
            delete src.summerize_token_count;
        }

        // Keys expected to be integers
        const intKeys = new Set([
            'threads', 'seed', 'top_k', 'summarize_token_count', 'context_size', 'nGpuLayers', 'timeout', 'maxTokens', 'max_tokens'
        ]);
        // Keys expected to be floats
        const floatKeys = new Set([
            'temperature', 'top_p', 'repeat_penalty'
        ]);
        // Keys expected to be booleans
        const boolKeys = new Set([
            'stream', 'noThinking'
        ]);
        // Keys expected to be arrays (stop strings)
        const arrayKeys = new Set([
            'stop_strings', 'stop', 'stopStrings'
        ]);

        const out = {};

        const toNumber = (v, isFloat) => {
            if (typeof v === 'number') return v;
            if (typeof v !== 'string') return v;
            const trimmed = v.trim();
            if (!trimmed) return v;
            const n = isFloat ? parseFloat(trimmed) : parseInt(trimmed, 10);
            return Number.isFinite(n) ? n : v;
        };

        const toBoolean = (v) => {
            if (typeof v === 'boolean') return v;
            if (typeof v !== 'string') return v;
            const t = v.trim().toLowerCase();
            if (t === 'true') return true;
            if (t === 'false') return false;
            return v;
        };

        const toArray = (v) => {
            if (Array.isArray(v)) return v;
            if (typeof v !== 'string') return v;
            const s = v.trim();
            if (!s) return [];
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) return parsed;
            } catch (_) {}
            return s.split(',').map(x => x.trim()).filter(x => x.length > 0);
        };

        for (const [key, value] of Object.entries(src)) {
            if (intKeys.has(key)) {
                out[key] = toNumber(value, false);
            } else if (floatKeys.has(key)) {
                out[key] = toNumber(value, true);
            } else if (boolKeys.has(key)) {
                out[key] = toBoolean(value);
            } else if (arrayKeys.has(key)) {
                out[key] = toArray(value);
            } else {
                out[key] = value;
            }
        }

        if (typeof out.model !== 'undefined') {
            out.model = String(out.model);
        }

        return out;
    }
}

module.exports = ToolsService;
