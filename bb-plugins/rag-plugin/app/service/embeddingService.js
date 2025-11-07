/**
 * EmbeddingService - Local Embedding Generation for Bookbag RAG
 *
 * Uses @xenova/transformers to run Hugging Face models locally in Node.js
 * - No Python dependencies
 * - No external API calls
 * - Fully offline capable
 * - Low memory footprint (~300 MB)
 *
 * Perfect for multi-tenant, self-hosted, local-first architecture
 */
class EmbeddingService {
    constructor() {
        this.pipe = null;
        this.pipelineFunction = null; // Store the pipeline function from dynamic import
        this.model = 'Xenova/all-MiniLM-L6-v2'; // Lightweight, fast, 384-dimensional embeddings
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    /**
     * Initialize the embedding model
     * This lazy-loads the model on first use
     * Uses dynamic import() to support ES modules in CommonJS
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                console.log(`🧠 Loading @xenova/transformers module...`);

                // Dynamic import to support ES module in CommonJS
                const transformers = await import('@xenova/transformers');
                this.pipelineFunction = transformers.pipeline;

                console.log(`🧠 Loading embedding model: ${this.model}...`);
                const startTime = Date.now();

                this.pipe = await this.pipelineFunction('feature-extraction', this.model);

                const loadTime = Date.now() - startTime;
                console.log(`✅ Embedding model loaded in ${loadTime}ms`);

                this.isInitialized = true;
            } catch (error) {
                console.error('❌ Failed to load embedding model:', error);
                console.error('   Error details:', error.message);
                console.error('   This may be due to:');
                console.error('   1. Missing @xenova/transformers package (run: npm install @xenova/transformers)');
                console.error('   2. Network issues downloading model files');
                console.error('   3. Insufficient memory or disk space');
                throw new Error(`Failed to initialize embedding service: ${error.message}`);
            }
        })();

        return this.initializationPromise;
    }

    /**
     * Generate embedding vector for text
     * @param {string} text - Text to embed
     * @param {Object} options - Options for embedding
     * @param {boolean} options.pooling - Pooling strategy ('mean' or 'cls')
     * @param {boolean} options.normalize - Whether to normalize the embedding
     * @returns {Promise<number[]>} - Embedding vector (384 dimensions)
     */
    async embed(text, options = {}) {
        await this.initialize();

        if (!text || typeof text !== 'string') {
            throw new Error('Text must be a non-empty string');
        }

        try {
            const { pooling = 'mean', normalize = true } = options;

            // Generate embedding
            const output = await this.pipe(text, { pooling, normalize });

            // Extract the embedding array from the tensor
            const embedding = Array.from(output.data);

            return embedding;
        } catch (error) {
            console.error('❌ Error generating embedding:', error);
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }

    /**
     * Generate embeddings for multiple texts in batch
     * More efficient than calling embed() multiple times
     * @param {string[]} texts - Array of texts to embed
     * @param {Object} options - Options for embedding
     * @returns {Promise<number[][]>} - Array of embedding vectors
     */
    async embedBatch(texts, options = {}) {
        await this.initialize();

        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Texts must be a non-empty array');
        }

        try {
            const embeddings = [];

            // Process in batches of 10 to avoid memory issues
            const batchSize = 10;
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchEmbeddings = await Promise.all(
                    batch.map(text => this.embed(text, options))
                );
                embeddings.push(...batchEmbeddings);
            }

            return embeddings;
        } catch (error) {
            console.error('❌ Error generating batch embeddings:', error);
            throw new Error(`Failed to generate batch embeddings: ${error.message}`);
        }
    }

    /**
     * Calculate cosine similarity between two embeddings
     * @param {number[]} a - First embedding vector
     * @param {number[]} b - Second embedding vector
     * @returns {number} - Similarity score (0-1, higher is more similar)
     */
    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) {
            throw new Error('Embeddings must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * Get model information
     * @returns {Object} - Model metadata
     */
    getModelInfo() {
        return {
            model: this.model,
            dimensions: 384,
            initialized: this.isInitialized,
            description: 'all-MiniLM-L6-v2 - Lightweight sentence transformer'
        };
    }

    /**
     * Unload the model to free memory
     * Useful for multi-tenant scenarios where you want to manage memory
     */
    async unload() {
        if (this.pipe) {
            this.pipe = null;
            this.isInitialized = false;
            this.initializationPromise = null;
            console.log('🗑️  Embedding model unloaded');
        }
    }
}

module.exports = EmbeddingService;
