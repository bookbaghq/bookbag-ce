
var masterrecord = require('masterrecord');
const path = require('path');
const Document = require('./document');
const DocumentChunk = require('./documentChunk');
const Settings = require('./settings');
/**
 * RAG Context - Database context for RAG operations
 *
 * Provides access to Documents and DocumentChunks tables
 * Inherits from masterrecord.context
 *
 * Uses absolute path to plugin's config/environments folder
 * to ensure the environment file is found correctly even when
 * the plugin is self-contained
 */
class ragContext extends masterrecord.context{
    constructor() {
        super();

        // Use absolute path to plugin's environment folder
        // __dirname is .../bb-plugins/rag-plugin/app/models
        // We need .../bb-plugins/rag-plugin/config/environments
        const pluginEnvPath = path.join(__dirname, '../../config/environments');
        this.env(pluginEnvPath);

        // Register Document model
        this.dbset(Document);

        // Register DocumentChunk model
        this.dbset(DocumentChunk);

        // Register Settings model
        this.dbset(Settings);
    }
}

module.exports = ragContext;
