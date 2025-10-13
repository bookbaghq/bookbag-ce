
var masterrecord = require('masterrecord');
const Document = require('./document');
const DocumentChunk = require('./documentChunk');

/**
 * RAG Context - Database context for RAG operations
 *
 * Provides access to Documents and DocumentChunks tables
 * Inherits from masterrecord.context
 */
class ragContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");

        // Register Document model
        this.dbset(Document);

        // Register DocumentChunk model
        this.dbset(DocumentChunk);
    }
}

module.exports = ragContext;
