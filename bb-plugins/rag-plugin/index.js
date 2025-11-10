/**
 * RAG Plugin
 * Self-contained RAG (Retrieval-Augmented Generation) plugin
 *
 * Provides:
 * - Document ingestion and embedding
 * - Knowledge base querying
 * - Vector storage
 * - Admin UI integration
 *
 * Uses: Generic Hooks System
 */

/**
 * Load method - called by pluginLoader with API
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginLoader, registerView, registerClientComponent }
 */
function load(pluginAPI) {
  const { hookService, HOOKS, registerView, registerClientComponent } = pluginAPI;
  const master = require('mastercontroller');

  // Register this plugin directory as a component so MasterController can find controllers
  // This allows the routes to resolve "api/rag#method" to this plugin's controllers
  try {
    master.component("bb-plugins", "rag-plugin");
  } catch (error) {
    console.error('  ✗ Failed to register plugin as component:', error.message);
  }

  // Register admin views (WordPress-style)
  try {
    registerView('rag-settings', 'admin/rag/settings/page', {
      title: 'RAG Settings',
      capability: 'manage_options',
      icon: 'settings'
    });
    registerView('rag-documents', 'admin/rag/documents/page', {
      title: 'RAG Documents',
      capability: 'manage_options',
      icon: 'file'
    });

    // Also register admin views as client components for static loading
    // This enables Next.js to resolve dependencies at build time
    registerClientComponent('RagSettingsPage', 'admin/rag/settings/page.js', {
      description: 'RAG Settings admin page',
      usage: 'admin-view',
      viewSlug: 'rag-settings'
    });
    registerClientComponent('RagDocumentsPage', 'admin/rag/documents/page.js', {
      description: 'RAG Documents admin page',
      usage: 'admin-view',
      viewSlug: 'rag-documents'
    });
  } catch (error) {
    console.error('  ✗ Failed to register admin views:', error.message);
  }

  // Register client components
  try {
    // Register unbundled source - symlink + loader approach resolves at build time
    registerClientComponent('KnowledgeBaseSidebar', 'client/KnowledgeBaseSidebar.js', {
      description: 'Document management sidebar for chat interface',
      usage: 'sidebar-left', // WordPress-style: register for left sidebar position
      features: ['document-list', 'workspace-creation', 'document-upload', 'rag-settings']
    });
  } catch (error) {
    console.error('  ✗ Failed to register client components:', error.message);
  }

  // Register LLM_BEFORE_GENERATE hook - RAG context injection
  // This is the core hook that injects RAG context into the LLM pipeline
  const llmBeforeGenerateHandler = require('./app/hooks/llmBeforeGenerateHandler');
  hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, llmBeforeGenerateHandler, 10);

  // Register admin_menu hook for sidebar menu
  hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
    // Add top-level RAG menu
    context.addMenuItem({
      id: 'rag',
      label: 'RAG',
      url: '/bb-admin/plugin/rag-documents', // WordPress-style: /bb-admin/plugin/[slug]
      icon: 'Database',
      position: 30
    });

    // Add submenus
    context.addSubmenuItem('rag', {
      label: 'Documents',
      url: '/bb-admin/plugin/rag-documents'
    });

    context.addSubmenuItem('rag', {
      label: 'Settings',
      url: '/bb-admin/plugin/rag-settings'
    });
  }, 10);

}

/**
 * Activate method - called when plugin is first activated
 * WordPress equivalent: register_activation_hook()
 *
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginLoader, pluginPath }
 */
async function activate(pluginAPI) {
  const path = require('path');
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  const fs = require('fs').promises;

  try {
    const master = require('mastercontroller');
    const pluginDir = __dirname;

    // 1. Run database migrations
    try {
      // Check if migrations directory exists
      const migrationsPath = path.join(pluginDir, 'app/models/db/migrations');
      try {
        await fs.access(migrationsPath);

        // Run masterrecord migrations for this plugin
        await execAsync(
          `cd ${master.root} && masterrecord update-database rag`,
          { env: process.env }
        );
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    } catch (err) {
      console.error('  ✗ Migration error:', err.message);
      throw err;
    }

    // 2. Create symlink for Next.js integration
    try {
      const loaderGenerator = require(`${master.root}/components/plugins/app/core/loaderGenerator.js`);
      await loaderGenerator.createPluginSymlink('rag-plugin');
    } catch (err) {
      console.warn('  ⚠ Symlink creation error:', err.message);
    }

    // 3. Create necessary directories
    const directories = [
      path.join(master.root, 'storage/rag/documents'),
      path.join(master.root, 'storage/rag/vectors')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
      }
    }

    // 4. Fire PLUGIN_ACTIVATED hook
    if (pluginAPI.hookService && pluginAPI.HOOKS) {
      await pluginAPI.hookService.doAction(pluginAPI.HOOKS.PLUGIN_ACTIVATED, {
        pluginName: 'rag-plugin',
        pluginPath: pluginDir
      });
    }

    return {
      success: true,
      message: 'RAG Plugin activated successfully'
    };

  } catch (error) {
    console.error('✗ RAG Plugin activation failed:', error.message);
    console.error(error.stack);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deactivate method - called when plugin is deactivated
 * WordPress equivalent: register_deactivation_hook()
 *
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginLoader, pluginPath }
 */
async function deactivate(pluginAPI) {
  try {
    // Fire PLUGIN_DEACTIVATED hook
    if (pluginAPI.hookService && pluginAPI.HOOKS) {
      await pluginAPI.hookService.doAction(pluginAPI.HOOKS.PLUGIN_DEACTIVATED, {
        pluginName: 'rag-plugin',
        pluginPath: __dirname
      });
    }

    return {
      success: true,
      message: 'RAG Plugin deactivated successfully'
    };

  } catch (error) {
    console.error('✗ RAG Plugin deactivation failed:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { load, activate, deactivate };
