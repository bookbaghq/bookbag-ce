/**
 * Tokens Plugin - Main Entry Point
 *
 * Provides comprehensive token usage analytics and management:
 * - Tracks token usage across all LLM requests
 * - Enforces global, per-user, and per-chat token limits
 * - Provides detailed analytics and cost estimation
 * - Real-time monitoring and notifications
 *
 * Uses: Generic Hooks System
 */


// Import hook handlers
const llmBeforeGenerateHandler = require('./app/hooks/llmBeforeGenerateHandler');
const llmAfterGenerateHandler = require('./app/hooks/llmAfterGenerateHandler');
const chatAfterMessageHandler = require('./app/hooks/chatAfterMessageHandler');

/**
 * Load method - called by pluginLoader with API
 * @param {Object} pluginAPI - { hookService, HOOKS, pluginLoader, registerView, registerClientComponent }
 */

function load(pluginAPI) {
  try {
    const { hookService, HOOKS, registerView, registerClientComponent } = pluginAPI;
    const master = require('mastercontroller');

     // Register this plugin directory as a component so MasterController can find controllers
      // This allows the routes to resolve "api/rag#method" to this plugin's controllers
     master.component("bb-plugins", "tokens-plugin");

      registerView('tokens-settings', 'admin/tokens/settings/page', {
        title: 'Token Settings',
        capability: 'manage_options',
        icon: 'settings'
      });

      registerView('tokens-analytics', 'admin/tokens/analytics/page', {
        title: 'Token Analytics',
        capability: 'manage_options',
        icon: 'activity'
      });

      // Also register admin views as client components for static loading
      // This enables Next.js to resolve dependencies at build time
      registerClientComponent('TokenSettingsPage', 'admin/tokens/settings/page.js', {
        description: 'Token Settings admin page',
        usage: 'admin-view',
        viewSlug: 'tokens-settings'
      });
      registerClientComponent('TokenAnalyticsPage', 'admin/tokens/analytics/page.js', {
        description: 'Token Analytics admin page',
        usage: 'admin-view',
        viewSlug: 'tokens-analytics'
      });


    // Register all hooks
    registerHooks(hookService, HOOKS);


    console.log('✓ Tokens Plugin loaded successfully');
  } catch (error) {
    console.warn('❌ Error loading Tokens Plugin:', error.message);
    console.warn(error.stack);
    throw error;
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
          `cd ${master.root} && masterrecord update-database tokens`,
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
      await loaderGenerator.createPluginSymlink('tokens-plugin');
    } catch (err) {
      console.warn('  ⚠ Symlink creation error:', err.message);
    }

    // 3. Create necessary directories
    const directories = [
      path.join(master.root, 'storage/tokens')
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
        pluginName: 'tokens-plugin',
        pluginPath: pluginDir
      });
    }

    return {
      success: true,
      message: 'Tokens Plugin activated successfully'
    };

  } catch (error) {
    console.error('✗ Tokens Plugin activation failed:', error.message);
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
        pluginName: 'tokens-plugin',
        pluginPath: __dirname
      });
    }

    return {
      success: true,
      message: 'Tokens Plugin deactivated successfully'
    };

  } catch (error) {
    console.error('✗ Tokens Plugin deactivation failed:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}


/**
 * Register all plugin hooks
 */
function registerHooks(hookService, HOOKS) {
  try {
    console.log('🪝 Registering Tokens Plugin hooks...');

    // Register LLM_BEFORE_GENERATE hook - Check token limits before LLM requests
    hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, llmBeforeGenerateHandler, 10);
    console.log('  ✓ LLM_BEFORE_GENERATE: Check token limits');

    // Register LLM_AFTER_GENERATE hook - Capture token usage after LLM responses
    hookService.addAction(HOOKS.LLM_AFTER_GENERATE, llmAfterGenerateHandler, 10);
    console.log('  ✓ LLM_AFTER_GENERATE: Capture token usage');

    // Register CHAT_AFTER_MESSAGE hook - Log message-level events
    hookService.addAction(HOOKS.CHAT_AFTER_MESSAGE, chatAfterMessageHandler, 10);
    console.log('  ✓ CHAT_AFTER_MESSAGE: Log message events');

    // Register ADMIN_MENU hook - Add admin menu items
    hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
      // Add top-level Tokens menu
      context.addMenuItem({
        id: 'tokens',
        label: 'Tokens',
        url: '/bb-admin/plugin/tokens-analytics', // WordPress-style: /bb-admin/plugin/[slug]
        icon: 'Activity',
        position: 35
      });

      // Add Analytics submenu
      context.addSubmenuItem('tokens', {
        label: 'Analytics',
        url: '/bb-admin/plugin/tokens-analytics'
      });

      // Add Settings submenu
      context.addSubmenuItem('tokens', {
        label: 'Settings',
        url: '/bb-admin/plugin/tokens-settings'
      });
    }, 10);
    console.log('  ✓ ADMIN_MENU: Add admin menu items');

    console.log('✓ All Tokens Plugin hooks registered');
  } catch (error) {
    console.warn('❌ Error registering hooks:', error.message);
    throw error;
  }
}


module.exports = { load, activate, deactivate };
