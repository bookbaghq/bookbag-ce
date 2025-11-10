/**
 * Tokens Context - Database context for token analytics operations
 *
 * Provides access to TokenUsage and TokenSettings tables
 * Inherits from masterrecord.context
 */

const masterrecord = require('masterrecord');
const path = require('path');
const TokenUsage = require('./tokenUsage');
const TokenSettings = require('./tokenSettings');

class tokensContext extends masterrecord.context {
    constructor() {
        super();
        const pluginEnvPath = path.join(__dirname, '../../config/environments');
        this.env(pluginEnvPath);
        
        // Register TokenUsage model
        this.dbset(TokenUsage);

        // Register TokenSettings model
        this.dbset(TokenSettings);
    }
}

module.exports = tokensContext;
