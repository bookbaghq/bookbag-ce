 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        this.createTable(table.Plugin);

        this.seed('Plugin', {
            name: 'dashboard-plugin',
            label: 'Dashboard Stats',
            description: 'Application Stats',
            file_path : "/dashboard-plugin/index.js",
            is_active : true,
            priority : 1,
            category : "admin-sidebar",
            version : "000.000.001",
            author: "Bookbag.ai",
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });
        
        this.seed('Plugin', {
            name: 'user-plugin',
            label: 'User Management',
            description: 'User accounts and permissions',
            file_path : "/user-plugin/index.js",
            is_active : true,
            priority : 2,
            category : "admin-sidebar",
            version : "000.000.001",
            author: "Bookbag.ai",
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });

        this.seed('Plugin', {
            name: "chat-plugin",
            label: 'Chat Management',
            description: "Chat LLM Communication",
            file_path : "/chat-plugin/index.js",
            is_active : true,
            priority : 3,
            category : "admin-sidebar",
            version : "000.000.001",
            author: "Bookbag.ai",
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });

        this.seed('Plugin', {
            name: 'workspace-plugin',
            label: 'Workspaces',
            description: 'Workspace collaboration features',
            file_path : "/workspace-plugin/index.js",
            is_active : true,
            priority : 4,
            category : "admin-sidebar",
            version : "000.000.001",
            author: "Bookbag.ai",
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });

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
            name: "models-plugin",
            label: 'Models',
            description: "A LLM Management System",
            file_path : "/model-plugin/index.js",
            is_active : true,
            priority : 6,
            category : "admin-sidebar",
            version : "000.000.001",
            author: "Bookbag.ai",
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });


        this.seed('Plugin', {
            name: "media-plugin",
            label: 'Media',
            description: "A Media Management System",
            file_path : "/media-plugin/index.js",
            is_active : true,
            priority : 7,
            category : "admin-sidebar",
            version : "000.000.001",
            author: "Bookbag.ai",
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });

        this.seed('Plugin', {
            name: 'admin-plugin',
            label: 'Administration',
            description: 'System Administration and Configuration',
            file_path : "/admin-plugin/index.js",
            is_active : true,
            priority : 8,
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

        this.seed('Plugin', {
            name: 'mail-plugin',
            label: 'Email Integration',
            description: 'Email sending and SMTP configuration',
            file_path : "/mail-plugin/index.js",
            is_active : true,
            priority : 10,
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
        