/**
 * Token Counting Utilities for Chat Interface
 * Handles token estimation and counting logic
 */

// Frontend token estimation removed; backend provides authoritative counts

/**
 * Get token count for a message
 * @param {object} message - Message object
 * @returns {number} - Token count (from database or estimated)
 */
export function getMessageTokenCount(message) {
  return (typeof message.token_count === 'number') ? message.token_count : 0;
}

/**
 * Get the maxTokens that were used when a specific message was generated
 * @param {object} message - Message object
 * @param {object} modelLimits - Current model limits as fallback
 * @returns {number} - Max tokens for this message
 */
export function getMessageMaxTokens(message, modelLimits) {
  // Use only DB value if present
  if (typeof message.max_tokens === 'number' && message.max_tokens > 0) {
    return message.max_tokens;
  }
  // If modelLimits explicitly provides a numeric maxTokens (e.g., for local models), use it; otherwise skip cap
  const limit = modelLimits?.maxTokens;
  return (typeof limit === 'number' && limit > 0) ? limit : null;
}

/**
 * Calculate total conversation token count
 * @param {array} messages - Array of message objects
 * @returns {number} - Total token count
 */
export function calculateConversationTokenCount(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;
  let totalTokens = 0;
  messages.forEach(message => {
    const count = (typeof message.token_count === 'number') ? message.token_count : 0;
    totalTokens += count;
  });
  return totalTokens;
}

/**
 * Input preprocessing to ensure proper spacing
 * @param {string} text - Input text to preprocess
 * @returns {object} - Object with cleaned text and spacing warning
 */
export function preprocessInput(text) {
  // Remove extra whitespace and normalize
  let cleaned = text.trim().replace(/\s+/g, ' ');
  
  // Check if text has very few spaces compared to length (likely concatenated words)
  const wordCount = cleaned.split(' ').length;
  const charCount = cleaned.length;
  
  // If very long text with very few spaces, warn user
  if (charCount > 30 && wordCount < 3) {
    return {
      text: cleaned,
      needsSpacing: true
    };
  }
  
  return {
    text: cleaned,
    needsSpacing: false
  };
}
