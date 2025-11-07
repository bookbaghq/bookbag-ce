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
  const path = require('path');
  const master = require('mastercontroller');

  // Register this plugin directory as a component so MasterController can find controllers
  // This allows the routes to resolve "api/rag#method" to this plugin's controllers
  try {
    console.log('  ✓ Registering RAG plugin as MasterController component');
    master.component("bb-plugins", "rag-plugin");
  } catch (error) {
    console.error('  ✗ Failed to register plugin as component:', error.message);
  }

  // Register admin views (WordPress-style)
  try {
    console.log('  ✓ Registering RAG plugin admin views');
    registerView('rag-settings', 'pages/admin/rag/settings/page', {
      title: 'RAG Settings',
      capability: 'manage_options',
      icon: 'settings'
    });
    registerView('rag-documents', 'pages/admin/rag/documents/page', {
      title: 'RAG Documents',
      capability: 'manage_options',
      icon: 'file'
    });
  } catch (error) {
    console.error('  ✗ Failed to register admin views:', error.message);
  }

  // Register client components
  try {
    console.log('  ✓ Registering RAG plugin client components');
    registerClientComponent('KnowledgeBaseSidebar', 'pages/client/KnowledgeBaseSidebar.js', {
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
  console.log('  ✓ Registered LLM_BEFORE_GENERATE hook for RAG context injection');

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

  // todo?  why do we need this
  // Register routes by loading the routes file
  // This happens during plugin load, which is after MasterController initialization
  try {
    const routesPath = path.join(__dirname, 'config', 'routes.js');
    console.log('  ✓ Loading RAG routes from plugin:', routesPath);
    require(routesPath);
    console.log('  ✓ RAG routes registered successfully');
  } catch (error) {
    console.error('  ✗ Failed to load RAG routes:', error.message);
  }
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

  console.log('\n🔌 Activating RAG Plugin...');

  try {
    // 1. Install npm dependencies
    console.log('  📦 Installing plugin dependencies...');
    const pluginDir = path.join(__dirname);

    // Check if package.json exists
    const packageJsonPath = path.join(pluginDir, 'package.json');
    try {
      await fs.access(packageJsonPath);
      console.log(`  ✓ Found package.json at ${packageJsonPath}`);

      // Run npm install in plugin directory
      const { stdout, stderr } = await execAsync('npm install', {
        cwd: pluginDir,
        env: { ...process.env, NODE_ENV: 'production' }
      });

      if (stdout) console.log(`  ✓ npm install output:\n${stdout.split('\n').map(l => '    ' + l).join('\n')}`);
      if (stderr && !stderr.includes('npm WARN')) {
        console.warn(`  ⚠ npm install warnings:\n${stderr.split('\n').map(l => '    ' + l).join('\n')}`);
      }

      console.log('  ✓ Plugin dependencies installed successfully');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('  ℹ No package.json found, skipping dependency installation');
      } else {
        throw err;
      }
    }

    // 2. Run database migrations
    console.log('  🗄️  Running database migrations...');
    try {
      const master = require('mastercontroller');

      // Check if migrations directory exists
      const migrationsPath = path.join(pluginDir, 'app/models/db/migrations');
      try {
        await fs.access(migrationsPath);

        // Run masterrecord migrations for this plugin
        const { stdout: migrationOutput } = await execAsync(
          `cd ${master.root} && masterrecord update-database rag`,
          { env: process.env }
        );

        console.log('  ✓ Database migrations completed');
        if (migrationOutput) {
          console.log(`${migrationOutput.split('\n').map(l => '    ' + l).join('\n')}`);
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('  ℹ No migrations found, skipping');
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('  ✗ Migration error:', err.message);
      throw err;
    }

    // 3. Create necessary directories
    console.log('  📁 Creating plugin directories...');
    const master = require('mastercontroller');
    const directories = [
      path.join(master.root, 'storage/rag/documents'),
      path.join(master.root, 'storage/rag/vectors')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`  ✓ Created directory: ${dir}`);
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

    console.log('✓ RAG Plugin activated successfully!\n');

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
  console.log('\n🔌 Deactivating RAG Plugin...');

  try {
    // Fire PLUGIN_DEACTIVATED hook
    if (pluginAPI.hookService && pluginAPI.HOOKS) {
      await pluginAPI.hookService.doAction(pluginAPI.HOOKS.PLUGIN_DEACTIVATED, {
        pluginName: 'rag-plugin',
        pluginPath: __dirname
      });
    }

    console.log('✓ RAG Plugin deactivated successfully!\n');

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
