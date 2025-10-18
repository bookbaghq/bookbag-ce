const master = require('mastercontroller');

/**
 * ResponseNormalizationService
 *
 * Normalizes responses from different LLM vendors into a unified OpenAI-compatible schema.
 * This allows the frontend to handle all responses uniformly regardless of the provider.
 *
 * Standard format:
 * {
 *   role: "assistant",
 *   content: [
 *     { type: "text", text: "...", meta: { source, vendor, model } },
 *     { type: "image_url", image_url: "https://...", meta: { source, vendor, model } },
 *     { type: "base64", data: "...", meta: { source, vendor, model } }
 *   ]
 * }
 */
class ResponseNormalizationService {

    /**
     * Normalize response based on vendor
     * @param {string|object} response - Raw response from LLM
     * @param {string} vendor - Vendor name (openai, anthropic, grok, mistral, etc.)
     * @param {string} model - Model name
     * @returns {object} Normalized response with content blocks
     */
    normalize(response, vendor, model = null) {
        const vendorLower = (vendor || '').toLowerCase();

        switch (vendorLower) {
            case 'openai':
                return this.normalizeOpenAI(response, model);
            case 'anthropic':
            case 'claude':
                return this.normalizeAnthropic(response, model);
            case 'grok':
            case 'xai':
                return this.normalizeGrok(response, model);
            case 'mistral':
                return this.normalizeMistral(response, model);
            case 'google':
            case 'gemini':
                return this.normalizeGemini(response, model);
            default:
                // Generic fallback for unknown vendors
                return this.normalizeGeneric(response, vendor, model);
        }
    }

    /**
     * Normalize OpenAI response
     * OpenAI already uses content[] format, but we add metadata and ensure consistency
     */
    normalizeOpenAI(response, model = null) {
        // Handle both raw API response and already-extracted content
        const content = response?.choices?.[0]?.message?.content || response?.content || response;
        const role = response?.choices?.[0]?.message?.role || response?.role || 'assistant';

        const contentBlocks = [];

        // String content (old format)
        if (typeof content === 'string') {
            contentBlocks.push({
                type: 'text',
                text: content,
                meta: { source: 'openai', vendor: 'OpenAI', model }
            });
        }
        // Array content (multimodal format)
        else if (Array.isArray(content)) {
            for (const block of content) {
                if (block.type === 'text' && block.text) {
                    contentBlocks.push({
                        type: 'text',
                        text: block.text,
                        meta: { source: 'openai', vendor: 'OpenAI', model }
                    });
                }
                if (block.type === 'image_url' && block.image_url) {
                    const imageUrl = typeof block.image_url === 'string'
                        ? block.image_url
                        : block.image_url.url;
                    contentBlocks.push({
                        type: 'image_url',
                        image_url: imageUrl,
                        meta: { source: 'openai', vendor: 'OpenAI', model }
                    });
                }
                if (block.type === 'base64' && block.data) {
                    contentBlocks.push({
                        type: 'base64',
                        data: block.data,
                        meta: { source: 'openai', vendor: 'OpenAI', model }
                    });
                }
            }
        }

        return {
            role,
            content: contentBlocks
        };
    }

    /**
     * Normalize Anthropic/Claude response
     * Claude returns Markdown with inline images: ![alt](url)
     */
    normalizeAnthropic(response, model = null) {
        const rawText = typeof response === 'string' ? response : response?.content?.[0]?.text || '';

        // Extract image URLs from Markdown syntax and plain URLs
        const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
        const urlRegex = /(https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|webp))/gi;

        const imageUrls = [];
        let match;

        // Extract Markdown images
        while ((match = imageRegex.exec(rawText)) !== null) {
            imageUrls.push(match[1]);
        }

        // Extract standalone image URLs
        while ((match = urlRegex.exec(rawText)) !== null) {
            if (!imageUrls.includes(match[1])) {
                imageUrls.push(match[1]);
            }
        }

        // Remove image markdown and URLs from text
        let cleanText = rawText
            .replace(imageRegex, '')
            .replace(urlRegex, '')
            .trim();

        const contentBlocks = [];

        if (cleanText) {
            contentBlocks.push({
                type: 'text',
                text: cleanText,
                meta: { source: 'anthropic', vendor: 'Anthropic', model }
            });
        }

        imageUrls.forEach(url => {
            contentBlocks.push({
                type: 'image_url',
                image_url: url,
                meta: { source: 'anthropic', vendor: 'Anthropic', model }
            });
        });

        return {
            role: 'assistant',
            content: contentBlocks
        };
    }

    /**
     * Normalize Grok/xAI response
     * Similar to Claude - Markdown or plain text URLs
     */
    normalizeGrok(response, model = null) {
        const rawText = typeof response === 'string' ? response : response?.output || response?.content || '';

        // Extract image URLs
        const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
        const urlRegex = /(https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|webp))/gi;

        const imageUrls = [];
        let match;

        while ((match = imageRegex.exec(rawText)) !== null) {
            imageUrls.push(match[1]);
        }

        while ((match = urlRegex.exec(rawText)) !== null) {
            if (!imageUrls.includes(match[1])) {
                imageUrls.push(match[1]);
            }
        }

        // Clean text
        let cleanText = rawText
            .replace(imageRegex, '')
            .replace(urlRegex, '')
            .trim();

        const contentBlocks = [];

        if (cleanText) {
            contentBlocks.push({
                type: 'text',
                text: cleanText,
                meta: { source: 'grok', vendor: 'xAI', model }
            });
        }

        imageUrls.forEach(url => {
            contentBlocks.push({
                type: 'image_url',
                image_url: url,
                meta: { source: 'grok', vendor: 'xAI', model }
            });
        });

        return {
            role: 'assistant',
            content: contentBlocks
        };
    }

    /**
     * Normalize Mistral response
     * Similar extraction pattern
     */
    normalizeMistral(response, model = null) {
        const rawText = typeof response === 'string' ? response : response?.output || response?.content || '';

        const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
        const urlRegex = /(https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|webp))/gi;

        const imageUrls = [];
        let match;

        while ((match = imageRegex.exec(rawText)) !== null) {
            imageUrls.push(match[1]);
        }

        while ((match = urlRegex.exec(rawText)) !== null) {
            if (!imageUrls.includes(match[1])) {
                imageUrls.push(match[1]);
            }
        }

        let cleanText = rawText
            .replace(imageRegex, '')
            .replace(urlRegex, '')
            .trim();

        const contentBlocks = [];

        if (cleanText) {
            contentBlocks.push({
                type: 'text',
                text: cleanText,
                meta: { source: 'mistral', vendor: 'Mistral', model }
            });
        }

        imageUrls.forEach(url => {
            contentBlocks.push({
                type: 'image_url',
                image_url: url,
                meta: { source: 'mistral', vendor: 'Mistral', model }
            });
        });

        return {
            role: 'assistant',
            content: contentBlocks
        };
    }

    /**
     * Normalize Google Gemini response
     */
    normalizeGemini(response, model = null) {
        const rawText = typeof response === 'string' ? response : response?.content || response?.text || '';

        const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
        const urlRegex = /(https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|webp))/gi;

        const imageUrls = [];
        let match;

        while ((match = imageRegex.exec(rawText)) !== null) {
            imageUrls.push(match[1]);
        }

        while ((match = urlRegex.exec(rawText)) !== null) {
            if (!imageUrls.includes(match[1])) {
                imageUrls.push(match[1]);
            }
        }

        let cleanText = rawText
            .replace(imageRegex, '')
            .replace(urlRegex, '')
            .trim();

        const contentBlocks = [];

        if (cleanText) {
            contentBlocks.push({
                type: 'text',
                text: cleanText,
                meta: { source: 'google', vendor: 'Google', model }
            });
        }

        imageUrls.forEach(url => {
            contentBlocks.push({
                type: 'image_url',
                image_url: url,
                meta: { source: 'google', vendor: 'Google', model }
            });
        });

        return {
            role: 'assistant',
            content: contentBlocks
        };
    }

    /**
     * Generic normalization fallback for unknown vendors
     */
    normalizeGeneric(response, vendor, model = null) {
        const rawText = typeof response === 'string' ? response : response?.content || response?.output || JSON.stringify(response);

        const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
        const urlRegex = /(https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|webp))/gi;

        const imageUrls = [];
        let match;

        while ((match = imageRegex.exec(rawText)) !== null) {
            imageUrls.push(match[1]);
        }

        while ((match = urlRegex.exec(rawText)) !== null) {
            if (!imageUrls.includes(match[1])) {
                imageUrls.push(match[1]);
            }
        }

        let cleanText = rawText
            .replace(imageRegex, '')
            .replace(urlRegex, '')
            .trim();

        const contentBlocks = [];

        if (cleanText) {
            contentBlocks.push({
                type: 'text',
                text: cleanText,
                meta: { source: vendor, vendor: vendor, model }
            });
        }

        imageUrls.forEach(url => {
            contentBlocks.push({
                type: 'image_url',
                image_url: url,
                meta: { source: vendor, vendor: vendor, model }
            });
        });

        return {
            role: 'assistant',
            content: contentBlocks
        };
    }

    /**
     * Extract content blocks from normalized response
     * @param {object} normalized - Normalized response
     * @param {string} type - Block type to extract ('text', 'image_url', 'base64')
     * @returns {array} Array of matching blocks
     */
    extractContentBlocks(normalized, type) {
        if (!normalized || !normalized.content) return [];
        return normalized.content.filter(block => block.type === type);
    }

    /**
     * Check if response contains images
     * @param {object} normalized - Normalized response
     * @returns {boolean}
     */
    hasImages(normalized) {
        if (!normalized || !normalized.content) return false;
        return normalized.content.some(block => block.type === 'image_url' || block.type === 'base64');
    }

    /**
     * Get all image URLs from normalized response
     * @param {object} normalized - Normalized response
     * @returns {array} Array of image URLs
     */
    getImageUrls(normalized) {
        if (!normalized || !normalized.content) return [];
        return normalized.content
            .filter(block => block.type === 'image_url')
            .map(block => block.image_url);
    }

    /**
     * Get text content from normalized response
     * @param {object} normalized - Normalized response
     * @returns {string} Combined text content
     */
    getTextContent(normalized) {
        if (!normalized || !normalized.content) return '';
        return normalized.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n\n');
    }
}

module.exports = ResponseNormalizationService;
