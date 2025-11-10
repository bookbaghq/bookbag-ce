/**
 * RAG LLM_BEFORE_GENERATE Hook Handler
 *
 * This handler intercepts message history before it's sent to the LLM
 * and injects RAG context if appropriate.
 *
 * Implements three flag-based controls:
 * 1. disable_rag: Globally disable RAG system
 * 2. disable_rag_for_chats: Disable RAG for regular chat-level requests
 * 3. disable_rag_for_workspaces: Disable RAG for workspace-level requests
 *
 * @param {Object} context - Hook context containing messageHistory and metadata
 * @returns {Object} - Modified context with updated messageHistory
 */

const path = require('path');
const master = require('mastercontroller');

// Load RAG models and services from the plugin
const RAGContext = require('../models/ragContext');
const RAGService = require('../service/ragService');

async function handleLLMBeforeGenerate(context) {
    try {
        // Extract parameters from hook context
        const {
            messageHistory,
            chatId,
            workspaceId,
            modelConfig,
            modelSettings,
            userMessageId,
            baseUrl,
            chatContext,
            currentUser
        } = context;

        // Validate required parameters
        if (!messageHistory || !Array.isArray(messageHistory)) {
            return context;
        }

        // Initialize RAG context
        const ragContext = new RAGContext();

        // 🚫 FLAG CHECK: Check if RAG should be skipped based on settings
        const shouldSkip = RAGService.shouldSkipRAG(ragContext, chatContext, chatId);

        if (shouldSkip) {
            return context; // Return unmodified context
        }

        // 📝 Extract user's latest message (last message in history)
        const userMessage = messageHistory[messageHistory.length - 1];
        if (!userMessage || !userMessage.content) {
            return context;
        }

        const question = userMessage.content;

        // 🧠 Query RAG system
        const ragService = new RAGService(ragContext);
        const ragResults = await ragService.queryRAG({
            chatId,
            workspaceId,
            question,
            k: 5 // Top 5 results
        });

        // If no results, return unmodified context
        if (!ragResults || ragResults.length === 0) {
            return context;
        }

        // 📄 Build context string from results
        const ragContextString = ragService.buildContextString(ragResults);

        // 💉 Inject RAG context into message history
        // Insert the RAG context as a system message before the user's question
        const modifiedMessageHistory = [...messageHistory];

        // Insert RAG context right before the last user message
        const ragSystemMessage = {
            role: 'system',
            content: ragContextString
        };

        // Insert at second-to-last position (before the user's message)
        modifiedMessageHistory.splice(modifiedMessageHistory.length - 1, 0, ragSystemMessage);

        // Return modified context with updated messageHistory
        return {
            ...context,
            messageHistory: modifiedMessageHistory
        };

    } catch (error) {
        console.error('❌ RAG Plugin: Error in LLM_BEFORE_GENERATE handler:', error.message);
        console.error(error.stack);

        // On error, return unmodified context (fail gracefully)
        return context;
    }
}

module.exports = handleLLMBeforeGenerate;
