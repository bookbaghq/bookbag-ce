/**
 * RAGService - Retrieval-Augmented Generation Service
 *
 * Handles:
 * - Document chunking (breaking large documents into searchable pieces)
 * - Embedding generation (converting text to vector representations)
 * - Vector similarity search (finding relevant chunks for queries)
 * - Integration with chat/LLM systems
 *
 * Uses OpenAI's text-embedding-3-small model for embeddings
 * Stores embeddings in LanceDB for fast ANN search
 * Stores metadata in MySQL/SQLite
 */
class RAGService {
    constructor(context, openaiApiKey = null) {
        this.context = context;

        // Initialize OpenAI client if available
        this.openaiClient = null;
        this.apiKey = openaiApiKey || process.env.OPENAI_API_KEY;

        if (this.apiKey) {
            try {
                const { OpenAI } = require('openai');
                this.openaiClient = new OpenAI({ apiKey: this.apiKey });
            } catch (error) {
                console.warn('⚠️  OpenAI package not found. Install with: npm install openai');
            }
        }

        // Initialize LanceDB vector store
        this.vectorStore = require('./vectorStore');
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
     * Chunk text into smaller pieces for embedding
     * @param {string} text - Full document text
     * @param {number} approxChunkSize - Approximate characters per chunk
     * @returns {string[]} - Array of text chunks
     */
    chunkText(text, approxChunkSize = 500) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        // Split by paragraphs (double newline)
        const paragraphs = text.split(/\n{2,}/);
        const chunks = [];
        let buffer = '';

        for (const paragraph of paragraphs) {
            const trimmedPara = paragraph.trim();
            if (!trimmedPara) continue;

            // If adding this paragraph would exceed chunk size and buffer has content
            if ((buffer + trimmedPara).length > approxChunkSize && buffer) {
                chunks.push(buffer.trim());
                buffer = '';
            }

            buffer += trimmedPara + '\n\n';
        }

        // Add remaining buffer
        if (buffer.trim()) {
            chunks.push(buffer.trim());
        }

        // If no chunks created (text might not have double newlines), split by size
        if (chunks.length === 0 && text.trim()) {
            return this.simpleSplitBySize(text, approxChunkSize);
        }

        return chunks;
    }

    /**
     * Simple split by character count (fallback for texts without paragraph breaks)
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
     * Generate embedding vector for text using OpenAI
     * @param {string} text - Text to embed
     * @returns {Promise<number[]>} - Embedding vector
     */
    async generateEmbedding(text) {
        if (!this.openaiClient) {
            throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
        }

        try {
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-3-small',
                input: text
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('❌ Error generating embedding:', error.message);
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }

    /**
     * Ingest a document: chunk it and store metadata
     * Embeddings will be generated on-demand during search
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

        // Chunk the text and store chunks (without embeddings)
        const chunks = this.chunkText(text, 500);
        console.log(`   ✓ Created ${chunks.length} chunks`);

        // Store chunks in database for later retrieval
        const DocumentChunkModel = require('../models/documentChunk');
        for (let i = 0; i < chunks.length; i++) {
            const chunk = new DocumentChunkModel();
            chunk.document_id = documentId;
            chunk.chunk_index = i;
            chunk.content = chunks[i];
            chunk.token_count = chunks[i].length;
            chunk.created_at = Date.now().toString();
            chunk.updated_at = Date.now().toString();

            this.context.DocumentChunk.add(chunk);
        }
        this.context.saveChanges();

        console.log(`   ✅ Document ingestion complete! (${chunks.length} chunks stored)\n`);

        return documentId;
    }

    /**
     * Query RAG system: find relevant chunks using LanceDB ANN search
     * @param {number} chatId - Chat ID
     * @param {string} question - User's question
     * @param {number} k - Number of top results to return
     * @returns {Promise<Array>} - Array of relevant chunks with scores
     */
    async queryRAG(chatId, question, k = 5) {
        console.log(`\n🔍 RAG QUERY (LanceDB ANN): "${question.substring(0, 50)}..."`);

        // Generate embedding for the question
        const questionEmbedding = await this.generateEmbedding(question);
        console.log(`   ✓ Generated question embedding`);

        // Search LanceDB using ANN
        const results = await this.vectorStore.searchVectors(chatId, questionEmbedding, k);
        console.log(`   ✓ LanceDB returned ${results.length} results`);

        // Get document metadata from database for enrichment
        const documentIds = [...new Set(results.map(r => r.document_id))];

        // Get all documents and filter in JavaScript (Master Record ORM doesn't support .includes() in where())
        const allDocuments = this.context.Document.toList();
        const documents = allDocuments.filter(d => documentIds.includes(d.id));

        const documentMap = {};
        for (const doc of documents) {
            documentMap[doc.id] = doc;
        }

        // Format results
        const scoredChunks = results.map(result => ({
            chunkId: result.chunk_id,
            documentId: result.document_id,
            documentTitle: documentMap[result.document_id]?.title || 'Unknown',
            chunkIndex: result.chunk_index || 0,
            content: result.content,
            score: 1 - (result._distance || 0), // Convert distance to similarity
            tokenCount: result.token_count || 0
        }));

        console.log(`   ✅ Found ${scoredChunks.length} relevant chunks`);
        if (scoredChunks.length > 0) {
            console.log(`   📈 Top score: ${scoredChunks[0].score.toFixed(4)}`);
        }

        return scoredChunks;
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
