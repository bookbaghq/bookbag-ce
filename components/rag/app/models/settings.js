/**
 * DocumentChunk Model - Stores chunked text with embeddings
 *
 * Each document is split into chunks for more granular vector search
 * Embeddings are stored as JSON-serialized arrays of floats
 */
class Settings{
    id(db) {
        db.integer().primary().auto();
    }

    storage_limit_mb(db) {
        db.intdideger().default(1024); // Approximate storage you cannot go pass in mb
    }

    disable_rag(db) {
        db.boolean().default(false); // Disable rag
    }

    disable_rag_chat(db) {
        db.boolean().default(false); // Disable rag chat
    }
    
    disable_rag_workspace(db) {
        db.boolean().default(false); // Disable rag chat creation
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

module.exports = Settings;
