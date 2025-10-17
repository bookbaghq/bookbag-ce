const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const EmbeddingService = require('./embeddingService');

/**
 * RAGService - Retrieval-Augmented Generation Service
 *
 * Handles:
 * - Document chunking (LangChain text splitters for smart chunking)
 * - Embedding generation (local @xenova/transformers - no API calls)
 * - Vector similarity search (finding relevant chunks for queries)
 * - Integration with chat/LLM systems
 *
 * Architecture:
 * - Chunking: @langchain/textsplitters (RecursiveCharacterTextSplitter)
 * - Embeddings: @xenova/transformers (all-MiniLM-L6-v2, 384 dims)
 * - Storage: SQLite (CE) or MySQL (EE) for metadata + embeddings
 * - No external APIs required - fully local and offline capable
 */
class RAGService {
    constructor(context) {
        this.context = context;

        // Initialize local embedding service
        this.embeddingService = new EmbeddingService();

        // Initialize text splitter with smart chunking
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 50, // Overlap to preserve context across boundaries
            separators: ['\n\n', '\n', '. ', '! ', '? ', ', ', ' ', '']
        });

        console.log('✅ RAGService initialized with local embeddings');
    }

    /**
     * Static helper to check if RAG should be skipped based on settings and chat type
     * @param {object} ragContext - RAG database context
     * @param {object} chatContext - Chat database context
     * @param {number} chatId - Chat ID to check
     * @returns {boolean} - true if RAG should be skipped, false if RAG should be used
     */
    static shouldSkipRAG(ragContext, chatContext, chatId) {
        try {
            // Get RAG settings
            let settings = null;
            try {
                settings = ragContext.Settings.single();
            } catch (err) {
                console.log('⚠️  Could not load RAG settings, using defaults (RAG enabled)');
                return false; // Default to RAG enabled if settings cannot be loaded
            }

            // If no settings exist, default to RAG enabled
            if (!settings) {
                return false;
            }

            // Rule 1: Check if RAG is globally disabled
            if (settings.disable_rag) {
                console.log('🚫 RAG: Globally disabled (disable_rag = true)');
                return true; // Skip RAG
            }

            // If chatId is not provided, allow RAG (for backward compatibility)
            if (!chatId) {
                return false;
            }

            // Get the chat to check if it's workspace-created
            let chat = null;
            try {
                chat = chatContext.Chat
                    .where(c => c.id == $$, parseInt(chatId, 10))
                    .single();
            } catch (err) {
                console.log(`⚠️  Could not load chat ${chatId}, allowing RAG by default`);
                return false; // Default to RAG enabled if chat cannot be loaded
            }

            if (!chat) {
                console.log(`⚠️  Chat ${chatId} not found, allowing RAG by default`);
                return false;
            }

            const isWorkspaceCreated = chat.is_workspace_created === true || chat.is_workspace_created === 1;

            // Rule 2: If workspace RAG is disabled and this is a workspace chat, skip RAG
            if (settings.disable_rag_workspace && isWorkspaceCreated) {
                console.log(`🚫 RAG: Disabled for workspace chats (disable_rag_workspace = true, chat ${chatId} is workspace-created)`);
                return true; // Skip RAG
            }

            // Rule 3: If chat RAG is disabled and this is NOT a workspace chat, skip RAG
            if (settings.disable_rag_chat && !isWorkspaceCreated) {
                console.log(`🚫 RAG: Disabled for regular chats (disable_rag_chat = true, chat ${chatId} is not workspace-created)`);
                return true; // Skip RAG
            }

            // All checks passed, RAG should be used
            console.log(`✅ RAG: Enabled for chat ${chatId} (workspace-created: ${isWorkspaceCreated})`);
            return false; // Use RAG

        } catch (error) {
            console.error('❌ Error checking RAG settings:', error.message);
            // On error, default to RAG enabled (safer for backward compatibility)
            return false;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {number[]} vectorA - First vector
     * @param {number[]} vectorB - Second vector
     * @returns {number} - Similarity score (0-1)
     */
    cosineSimilarity(vectorA, vectorB) {
        if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * Chunk text into smaller pieces using LangChain's RecursiveCharacterTextSplitter
     * This provides smarter chunking than naive character splitting
     * @param {string} text - Full document text
     * @returns {Promise<string[]>} - Array of text chunks
     */
    async chunkText(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        try {
            const chunks = await this.textSplitter.splitText(text);
            return chunks;
        } catch (error) {
            console.error('❌ Error chunking text:', error);
            // Fallback to simple splitting
            return this.simpleSplitBySize(text, 500);
        }
    }

    /**
     * Simple split by character count (fallback for errors)
     * @param {string} text - Text to split
     * @param {number} chunkSize - Characters per chunk
     * @returns {string[]} - Array of chunks
     */
    simpleSplitBySize(text, chunkSize) {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.substring(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Generate embedding vector for text using local Xenova transformers
     * @param {string} text - Text to embed
     * @returns {Promise<number[]>} - Embedding vector (384 dimensions)
     */
    async generateEmbedding(text) {
        try {
            return await this.embeddingService.embed(text);
        } catch (error) {
            console.error('❌ Error generating embedding:', error.message);
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }

    /**
     * Ingest a document: chunk it, generate embeddings, and store everything
     * @param {object} params - Document parameters
     * @param {number} [params.chatId] - Chat ID (optional - for chat-specific documents)
     * @param {number} [params.workspaceId] - Workspace ID (optional - for workspace-level shared documents)
     * @param {string} [params.tenantId] - Tenant/user ID (optional - kept for legacy)
     * @param {string} params.title - Document title
     * @param {string} params.filename - Original filename
     * @param {string} params.filePath - Path to stored file
     * @param {string} params.text - Full document text
     * @param {string} [params.mimeType] - MIME type
     * @param {number} [params.fileSize] - File size in bytes
     * @returns {Promise<number>} - Document ID
     */
    async ingestDocument({ chatId = null, workspaceId = null, tenantId = null, title, filename, filePath, text, mimeType = null, fileSize = 0 }) {
     

        // Create document record in MySQL/SQLite (metadata + full text)
        const DocumentModel = require('../models/document');
        const document = new DocumentModel();
        document.chat_id = chatId;
        document.workspace_id = workspaceId;
        document.tenant_id = tenantId;
        document.title = title;
        document.filename = filename;
        document.file_path = filePath;
        document.mime_type = mimeType;
        document.file_size = fileSize || 0;
        document.created_at = Date.now().toString();
        document.updated_at = Date.now().toString();

        this.context.Document.add(document);
        this.context.saveChanges();

        const documentId = document.id;
        console.log('🔍 Document ID:------------------------------------>', documentId);

        // Chunk the text using LangChain splitter
     
        const chunks = await this.chunkText(text);
     
        // Generate embeddings for all chunks in batch
     
        const startTime = Date.now();
        const embeddings = await this.embeddingService.embedBatch(chunks);
        const embeddingTime = Date.now() - startTime;
    

        // Store chunks with embeddings in database
        const DocumentChunkModel = require('../models/documentChunk');
        for (let i = 0; i < chunks.length; i++) {
            const chunk = new DocumentChunkModel();
            chunk.Document = documentId;
            chunk.chunk_index = i;
            chunk.content = chunks[i];
            chunk.embedding = JSON.stringify(embeddings[i]); // Store as JSON string
            chunk.token_count = chunks[i].length;
            chunk.created_at = Date.now().toString();
            chunk.updated_at = Date.now().toString();

            this.context.DocumentChunk.add(chunk);
        }
        this.context.saveChanges();

        return documentId;
    }

    /**
     * Query RAG system: find relevant chunks using cosine similarity
     * Supports layered retrieval: workspace-level + chat-specific documents
     * @param {object} params - Query parameters
     * @param {number} [params.chatId] - Chat ID (optional - for chat-specific documents)
     * @param {number} [params.workspaceId] - Workspace ID (optional - for workspace-level documents)
     * @param {string} params.question - User's question
     * @param {number} [params.k=5] - Number of top results to return
     * @returns {Promise<Array>} - Array of relevant chunks with scores
     */
    async queryRAG({ chatId = null, workspaceId = null, question, k = 5 }) {
 
        const questionEmbedding = await this.generateEmbedding(question);
       
        // 🔍 Step 1: Retrieve workspace-level documents (if workspaceId exists)
        let workspaceDocuments = [];
        if (workspaceId) {
            workspaceDocuments = this.context.Document
                .where(d => d.workspace_id == $$, workspaceId)
                .toList();
        }

        // 🔍 Step 2: Retrieve chat-specific documents (if chatId exists)
        let chatDocuments = [];
        if (chatId) {
            chatDocuments = this.context.Document
                .where(d => d.chat_id == $$, chatId)
                .toList();
        }

        // Merge and deduplicate documents
        const allDocuments = [...workspaceDocuments, ...chatDocuments];
        const uniqueDocumentIds = new Set(allDocuments.map(d => d.id));
        const documents = allDocuments.filter((doc, index, self) =>
            index === self.findIndex(d => d.id === doc.id)
        );

        if (documents.length === 0) {
            return [];
        }
      
        // Get all chunks for these documents
        const documentIds = documents.map(d => d.id);
        const allChunks = this.context.DocumentChunk.toList();
        // Support both document_id and Document field names (ORM may use either)
        const chunks = allChunks.filter(c => documentIds.includes(c.document_id || c.Document));

        console.log(`📊 RAG: Found ${documents.length} documents, ${allChunks.length} total chunks, ${chunks.length} matching chunks`);
        if (chunks.length === 0 && allChunks.length > 0) {
            console.warn(`⚠️  RAG: No chunks matched document IDs. Document IDs: ${documentIds}, Sample chunk:`, allChunks[0]);
        }

        // 🧠 Step 3: Calculate similarity for each chunk, merge, deduplicate, sort
        const scoredChunks = [];
        let processedChunks = 0;
        let skippedChunks = 0;
        for (const chunk of chunks) {
            if (!chunk.embedding) {
                skippedChunks++;
                continue;
            }

            try {
                // Parse the embedding from JSON
                const chunkEmbedding = JSON.parse(chunk.embedding);

                // Calculate cosine similarity
                const similarity = this.cosineSimilarity(questionEmbedding, chunkEmbedding);

                // Find the document for this chunk - support both field names
                const chunkDocId = chunk.document_id || chunk.Document;
                const document = documents.find(d => d.id === chunkDocId);
                processedChunks++;

                // Determine source (workspace or chat)
                const source = document?.workspace_id ? 'workspace' : 'chat';

                scoredChunks.push({
                    chunkId: chunk.id,
                    documentId: chunkDocId,
                    documentTitle: document?.title || 'Unknown',
                    chunkIndex: chunk.chunk_index,
                    content: chunk.content,
                    score: similarity,
                    tokenCount: chunk.token_count,
                    source: source
                });
            } catch (error) {
                console.error(`   ❌ Error processing chunk ${chunk.id}:`, error.message);
            }
        }

        console.log(`📊 RAG: Processed ${processedChunks} chunks, skipped ${skippedChunks} (no embedding)`);

        // Sort by similarity score (highest first) and take top k
        scoredChunks.sort((a, b) => b.score - a.score);
        const topResults = scoredChunks.slice(0, k);


        if (topResults.length > 0) {
            const workspaceCount = topResults.filter(r => r.source === 'workspace').length;
            const chatCount = topResults.filter(r => r.source === 'chat').length;
            console.log(`✅ RAG: Returning ${topResults.length} results (${workspaceCount} workspace, ${chatCount} chat)`);
            console.log(`   Top score: ${topResults[0].score.toFixed(4)}, Bottom score: ${topResults[topResults.length - 1].score.toFixed(4)}`);
        } else {
            console.log(`ℹ️  RAG: No results found after similarity calculation`);
        }

        return topResults;
    }

    /**
     * Build context string from top chunks for LLM prompt
     * 🔥 Tightening #2: Add retrieval metadata (source, score) for better model grounding
     * @param {Array} chunks - Array of chunks from queryRAG
     * @returns {string} - Formatted context string with metadata
     */
    buildContextString(chunks) {
        if (!chunks || chunks.length === 0) {
            return '';
        }

        let context = 'Here is relevant information from your knowledge base:\n\n';

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const sourceLabel = chunk.source === 'workspace' ? '🏢 Workspace' : '💬 Chat';
            const scoreLabel = `(relevance: ${(chunk.score * 100).toFixed(1)}%)`;

            context += `📄 [${i + 1}] ${sourceLabel} - "${chunk.documentTitle}" ${scoreLabel}\n`;
            context += `${chunk.content}\n\n`;
        }

        return context;
    }

    /**
     * Delete all chunks for a document
     * @param {number} documentId - Document ID
     * @returns {Promise<void>}
     */
    async deleteDocumentChunks(documentId) {
       
        // Delete chunks from database
        const chunks = this.context.DocumentChunk
            .where(c => c.document_id == $$, documentId)
            .toList();

        for (const chunk of chunks) {
            this.context.DocumentChunk.remove(chunk);
        }
        this.context.saveChanges();
    }

    /**
     * Get statistics for a chat's knowledge base
     * @param {number} chatId - Chat ID
     * @returns {Promise<object>} - Statistics object
     */
    async getChatStats(chatId) {
        const documents = this.context.Document
            .where(d => d.chat_id == $$, chatId)
            .toList();

        // Get chunk count by using lazy loading relationship
        let chunkCount = 0;
        let totalTokens = 0;

        for (const doc of documents) {
            const docChunks = doc.Chunks || [];
            chunkCount += docChunks.length;
            totalTokens += docChunks.reduce((sum, chunk) => sum + (chunk.token_count || 0), 0);
        }

        return {
            documentCount: documents.length,
            chunkCount: chunkCount,
            totalTokens: totalTokens,
            avgChunksPerDoc: documents.length > 0 ? Math.round(chunkCount / documents.length) : 0
        };
    }
}

module.exports = RAGService;
