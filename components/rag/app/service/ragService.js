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
     * @param {number} [params.chatId] - Chat ID (optional - will be set later if not provided)
     * @param {string} [params.tenantId] - Tenant/user ID (optional - kept for legacy)
     * @param {string} params.title - Document title
     * @param {string} params.filename - Original filename
     * @param {string} params.filePath - Path to stored file
     * @param {string} params.text - Full document text
     * @param {string} [params.mimeType] - MIME type
     * @returns {Promise<number>} - Document ID
     */
    async ingestDocument({ chatId = null, tenantId = null, title, filename, filePath, text, mimeType = null }) {
        console.log(`\n📥 INGESTING DOCUMENT: ${title}`);

        // Create document record in MySQL/SQLite (metadata + full text)
        const DocumentModel = require('../models/document');
        const document = new DocumentModel();
        document.chat_id = chatId;
        document.tenant_id = tenantId;
        document.title = title;
        document.filename = filename;
        document.file_path = filePath;
        document.mime_type = mimeType;
        document.created_at = Date.now().toString();
        document.updated_at = Date.now().toString();

        this.context.Document.add(document);
        this.context.saveChanges();

        const documentId = document.id;
        console.log(`   ✓ Created document record: ID ${documentId}`);

        // Chunk the text using LangChain splitter
        console.log(`   🔪 Chunking text...`);
        const chunks = await this.chunkText(text);
        console.log(`   ✓ Created ${chunks.length} chunks`);

        // Generate embeddings for all chunks in batch
        console.log(`   🧠 Generating embeddings for ${chunks.length} chunks...`);
        const startTime = Date.now();
        const embeddings = await this.embeddingService.embedBatch(chunks);
        const embeddingTime = Date.now() - startTime;
        console.log(`   ✓ Generated ${embeddings.length} embeddings in ${embeddingTime}ms`);

        // Store chunks with embeddings in database
        const DocumentChunkModel = require('../models/documentChunk');
        for (let i = 0; i < chunks.length; i++) {
            const chunk = new DocumentChunkModel();
            chunk.document_id = documentId;
            chunk.chunk_index = i;
            chunk.content = chunks[i];
            chunk.embedding = JSON.stringify(embeddings[i]); // Store as JSON string
            chunk.token_count = chunks[i].length;
            chunk.created_at = Date.now().toString();
            chunk.updated_at = Date.now().toString();

            this.context.DocumentChunk.add(chunk);
        }
        this.context.saveChanges();

        console.log(`   ✅ Document ingestion complete! (${chunks.length} chunks with embeddings stored)\n`);

        return documentId;
    }

    /**
     * Query RAG system: find relevant chunks using cosine similarity
     * @param {number} chatId - Chat ID
     * @param {string} question - User's question
     * @param {number} k - Number of top results to return
     * @returns {Promise<Array>} - Array of relevant chunks with scores
     */
    async queryRAG(chatId, question, k = 5) {
        console.log(`\n🔍 RAG QUERY: "${question.substring(0, 50)}..."`);

        // Generate embedding for the question
        console.log(`   🧠 Generating query embedding...`);
        const questionEmbedding = await this.generateEmbedding(question);
        console.log(`   ✓ Generated question embedding (${questionEmbedding.length} dims)`);

        // Get all documents for this chat
        const documents = this.context.Document
            .where(d => d.chat_id == $$, chatId)
            .toList();

        if (documents.length === 0) {
            console.log(`   ⚠️  No documents found for chat ${chatId}`);
            return [];
        }

        console.log(`   📚 Found ${documents.length} documents in knowledge base`);

        // Get all chunks for these documents
        const documentIds = documents.map(d => d.id);
        const allChunks = this.context.DocumentChunk.toList();
        const chunks = allChunks.filter(c => documentIds.includes(c.document_id));

        console.log(`   📄 Processing ${chunks.length} chunks...`);

        // Calculate similarity for each chunk
        const scoredChunks = [];
        for (const chunk of chunks) {
            if (!chunk.embedding) {
                console.warn(`   ⚠️  Chunk ${chunk.id} has no embedding, skipping`);
                continue;
            }

            try {
                // Parse the embedding from JSON
                const chunkEmbedding = JSON.parse(chunk.embedding);

                // Calculate cosine similarity
                const similarity = this.cosineSimilarity(questionEmbedding, chunkEmbedding);

                // Find the document for this chunk
                const document = documents.find(d => d.id === chunk.document_id);

                scoredChunks.push({
                    chunkId: chunk.id,
                    documentId: chunk.document_id,
                    documentTitle: document?.title || 'Unknown',
                    chunkIndex: chunk.chunk_index,
                    content: chunk.content,
                    score: similarity,
                    tokenCount: chunk.token_count
                });
            } catch (error) {
                console.error(`   ❌ Error processing chunk ${chunk.id}:`, error.message);
            }
        }

        // Sort by similarity score (highest first) and take top k
        scoredChunks.sort((a, b) => b.score - a.score);
        const topResults = scoredChunks.slice(0, k);

        console.log(`   ✅ Found ${topResults.length} relevant chunks`);
        if (topResults.length > 0) {
            console.log(`   📈 Top score: ${topResults[0].score.toFixed(4)}`);
            console.log(`   📉 Lowest score: ${topResults[topResults.length - 1].score.toFixed(4)}`);
        }

        return topResults;
    }

    /**
     * Build context string from top chunks for LLM prompt
     * @param {Array} chunks - Array of chunks from queryRAG
     * @returns {string} - Formatted context string
     */
    buildContextString(chunks) {
        if (!chunks || chunks.length === 0) {
            return '';
        }

        let context = 'Here is relevant information from your knowledge base:\n\n';

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            context += `[${i + 1}] From "${chunk.documentTitle}":\n`;
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
        console.log(`🗑️  Deleting chunks for document ${documentId}`);

        // Delete chunks from database
        const chunks = this.context.DocumentChunk
            .where(c => c.document_id == $$, documentId)
            .toList();

        for (const chunk of chunks) {
            this.context.DocumentChunk.remove(chunk);
        }
        this.context.saveChanges();

        console.log(`✅ Chunks deleted (${chunks.length} chunks)`);
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
