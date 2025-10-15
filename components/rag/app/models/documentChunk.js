/**
 * DocumentChunk Model - Stores chunked text with embeddings
 *
 * Each document is split into chunks for more granular vector search
 * Embeddings are stored as JSON-serialized arrays of floats
 */
class DocumentChunk {
    id(db) {
        db.integer().primary().auto();
    }

    Document(db) {
        db.belongsTo('Document', 'document_id');
    }

    chunk_index(db) {
        db.integer().notNullable(); // Order within the document (0, 1, 2...)
    }

    content(db) {
        db.string().notNullable(); // The actual text chunk
    }

    embedding(db) {
        db.string().nullable(); // JSON string: "[0.123, 0.456, ...]" - Generated on-demand
    }

    token_count(db) {
        db.integer().default(0); // Approximate token count
    }

    updated_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now();
            } else {
                return value;
            }
        });
    }

    created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now();
            } else {
                return value;
            }
        });
    }
}

module.exports = DocumentChunk;
