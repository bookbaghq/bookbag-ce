 
         
var masterrecord = require('masterrecord');
const path = require('path');
const PluginDiscovery = require('../../../core/pluginDiscovery');

class Init extends masterrecord.schema {
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        this.createTable(table.Plugin);

        // Discover all available plugins using WordPress-style discovery
        const pluginsDir = path.join(__dirname, '../../../../../../bb-plugins');
        const discovery = new PluginDiscovery(pluginsDir);
        const plugins = discovery.discoverPlugins();

        console.log(`📦 Discovered ${plugins.length} plugins for seeding`);

        // Seed database with discovered plugin metadata
        for (const plugin of plugins) {
            this.seed('Plugin', {
                name: plugin.slug,
                label: plugin.name,
                description: plugin.description || '',
                file_path: `/${plugin.slug}/${plugin.entry}`,
                is_active: true,
                priority: plugin.priority || 10,
                category: plugin.category || 'plugin',
                version: plugin.version || '1.0.0',
                author: plugin.author || '',
                icon: plugin.icon || null,
                created_at: Date.now().toString(),
                updated_at: Date.now().toString()
            });
            console.log(`  ✓ Seeded: ${plugin.slug} (priority: ${plugin.priority || 10})`);
        }

        // DEPRECATED: Manual seed entries below (kept for reference)
        // All plugins are now auto-discovered from plugin.json files
        return;

  
        this.seed('Plugin', {
            name: 'rag-plugin',
            label: 'RAG Knowledge Base',
            description: 'Retrieval-Augmented Generation knowledge base features',
            file_path : "/rag-plugin/index.js",
            is_active : true,
            priority : 5,
            category : "admin-sidebar",
            version : "000.000.001",
            author: "Bookbag.ai",
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });


        this.seed('Plugin', {
            name: 'tokens-plugin',
            label: 'Token Management',
            description: 'Token Management',
            file_path : "/tokens-plugin/index.js",
            is_active : true,
            priority : 9,
            category : "admin-sidebar",
            version : "000.000.001",
            author: "Bookbag.ai",
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });


    }

    down(table){
        this.init(table);
        
        this.droptable(table.Plugin);
    }
}
module.exports = Init;
        