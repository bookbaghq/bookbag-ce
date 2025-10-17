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
        db.integer().nullable(); // References Chat.id - for chat-specific documents
    }

    workspace_id(db) {
        db.integer().nullable(); // References Workspace.id - for workspace-level shared documents
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
        db.string().nullable(); // No longer storing files, only chunks
    }

    mime_type(db) {
        db.string(); // e.g., application/pdf, text/plain
    }

    Chunks(db) {
        db.hasMany('DocumentChunk');
    }

    file_size(db) {
        db.integer().notNullable().default(0);
    }

    created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }

    updated_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }
}

module.exports = Document;
