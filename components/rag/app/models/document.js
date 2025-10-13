/**
 * Document Model - Stores RAG document metadata
 *
 * Represents uploaded documents in the knowledge base
 * Each document can have multiple chunks for vector search
 */
class Document {
    id(db) {
        db.integer().primary().auto();
    }

    chat_id(db) {
        db.integer().nullable(); // References Chat.id - null during initial upload, set after chat creation
    }

    tenant_id(db) {
        db.string().nullable(); // User ID - kept for legacy/migration purposes
    }

    title(db) {
        db.string().notNullable();
    }

    filename(db) {
        db.string().notNullable();
    }

    file_path(db) {
        db.string().notNullable(); // Path to stored file
    }

    mime_type(db) {
        db.string(); // e.g., application/pdf, text/plain
    }

    Chunks(db) {
        db.hasMany('DocumentChunk');
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
}

module.exports = Document;
