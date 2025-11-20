/**
 * Universal Migration Manager for Bookbag Plugins
 *
 * Provides WordPress-style database migration automation for any plugin.
 * Uses MasterRecord CLI to run migrations during plugin activation.
 *
 * Usage:
 *   const { runMigrations } = require('components/plugins/app/core/migrationManager');
 *
 *   async function activate(pluginAPI) {
 *     await runMigrations('rag-plugin', pluginAPI.master);
 *   }
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const execAsync = util.promisify(exec);

/**
 * Log migration execution to database
 *
 * @param {Object} data - Migration log data
 * @param {string} data.plugin - Plugin name
 * @param {string} data.context - Context name
 * @param {string} data.status - 'success' or 'failed'
 * @param {string} data.error_message - Error message (if failed)
 * @param {string} data.stdout - Standard output
 * @param {string} data.stderr - Standard error
 * @returns {Promise<void>}
 */
async function logMigrationExecution(data) {
  try {
    // Lazy-load pluginContext to avoid circular dependencies
    const pluginContext = require('../models/pluginContext');
    const context = new pluginContext();

    // Create migration log entry
    const log = context.pluginMigrationLog.create({
      plugin: data.plugin,
      context: data.context,
      ran_at: Date.now().toString(),
      status: data.status || 'success',
      error_message: data.error_message || null,
      stdout: data.stdout || null,
      stderr: data.stderr || null
    });

    await context.pluginMigrationLog.save(log);
  } catch (err) {
    // Don't fail the migration if logging fails
    throw new Error(`Failed to log migration: ${err.message}`);
  }
}

/**
 * Run MasterRecord migrations for a plugin
 *
 * @param {string} pluginName - Plugin name (e.g., 'rag-plugin')
 * @param {Object} master - MasterController instance
 * @param {Object} options - Optional configuration
 * @param {string} options.contextName - Override auto-detected context name
 * @param {boolean} options.skipIfNoMigrations - Skip silently if no migrations directory exists
 * @returns {Promise<Object>} - { success: boolean, message?: string }
 */
async function runMigrations(pluginName, master, options = {}) {
  const env = process.env.master || 'development';

  // Auto-derive context name from plugin name
  // Example: 'rag-plugin' → 'ragContext'
  //          'tokens-plugin' → 'tokensContext'
  const defaultContextName = pluginName
    .replace('-plugin', '')
    .replace(/-/g, '')  // Remove any hyphens
    + 'Context';

  const contextName = options.contextName || defaultContextName;
  const pluginDir = path.join(master.root, 'bb-plugins', pluginName);
  const migrationsPath = path.join(pluginDir, 'app/models/db/migrations');

  let migrationLog = null;
  let logSuccess = false;

  try {
    // Check if migrations directory exists
    try {
      await fs.access(migrationsPath);
    } catch (err) {
      if (options.skipIfNoMigrations) {
        console.log(`  ℹ No migrations directory for ${pluginName}, skipping...`);
        return { success: true };
      }
      throw new Error(`No migrations directory found at ${migrationsPath}`);
    }

    console.log(`  ⚙️ Running MasterRecord migrations for ${contextName}...`);

    // Run masterrecord migrations via CLI
    const { stdout, stderr } = await execAsync(
      `master=${env} masterrecord update-database ${contextName}`,
      {
        cwd: master.root,
        env: { ...process.env, master: env }
      }
    );

    // Log output
    if (stdout) {
      console.log(`  Migration output:`, stdout.trim());
    }
    if (stderr && stderr.trim()) {
      console.error(`  Migration warnings:`, stderr.trim());
    }

    console.log(`  ✅ ${contextName} migrations completed successfully`);

    // Log successful migration to database
    try {
      await logMigrationExecution({
        plugin: pluginName,
        context: contextName,
        status: 'success',
        stdout: stdout || '',
        stderr: stderr || ''
      });
      logSuccess = true;
    } catch (logErr) {
      console.warn(`  ⚠ Failed to log migration: ${logErr.message}`);
    }

    return {
      success: true,
      message: `Migrations completed for ${contextName}`
    };

  } catch (err) {
    console.error(`  ❌ Migration failed for ${contextName}:`, err.message);
    if (err.stdout) console.log(`  stdout:`, err.stdout);
    if (err.stderr) console.error(`  stderr:`, err.stderr);

    // Log failed migration to database
    try {
      await logMigrationExecution({
        plugin: pluginName,
        context: contextName,
        status: 'failed',
        error_message: err.message,
        stdout: err.stdout || '',
        stderr: err.stderr || ''
      });
    } catch (logErr) {
      console.warn(`  ⚠ Failed to log migration error: ${logErr.message}`);
    }

    return {
      success: false,
      error: err.message,
      details: {
        stdout: err.stdout,
        stderr: err.stderr
      }
    };
  }
}

/**
 * Enable migrations for a plugin context (first-time setup)
 *
 * @param {string} pluginName - Plugin name (e.g., 'rag-plugin')
 * @param {Object} master - MasterController instance
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} - { success: boolean, message?: string }
 */
async function enableMigrations(pluginName, master, options = {}) {
  const env = process.env.master || 'development';

  const defaultContextName = pluginName
    .replace('-plugin', '')
    .replace(/-/g, '')
    + 'Context';

  const contextName = options.contextName || defaultContextName;

  try {
    console.log(`  ⚙️ Enabling migrations for ${contextName}...`);

    const { stdout, stderr } = await execAsync(
      `master=${env} masterrecord enable-migrations ${contextName}`,
      {
        cwd: master.root,
        env: { ...process.env, master: env }
      }
    );

    if (stdout) console.log(`  Output:`, stdout.trim());
    if (stderr && stderr.trim()) console.error(`  Warnings:`, stderr.trim());

    console.log(`  ✅ Migrations enabled for ${contextName}`);

    return {
      success: true,
      message: `Migrations enabled for ${contextName}`
    };

  } catch (err) {
    console.error(`  ❌ Failed to enable migrations for ${contextName}:`, err.message);

    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Create a new migration for a plugin context
 *
 * @param {string} pluginName - Plugin name (e.g., 'rag-plugin')
 * @param {string} migrationName - Migration name (e.g., 'Init', 'AddUserIdColumn')
 * @param {Object} master - MasterController instance
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} - { success: boolean, message?: string }
 */
async function addMigration(pluginName, migrationName, master, options = {}) {
  const env = process.env.master || 'development';

  const defaultContextName = pluginName
    .replace('-plugin', '')
    .replace(/-/g, '')
    + 'Context';

  const contextName = options.contextName || defaultContextName;

  try {
    console.log(`  ⚙️ Creating migration '${migrationName}' for ${contextName}...`);

    const { stdout, stderr } = await execAsync(
      `master=${env} masterrecord add-migration ${migrationName} ${contextName}`,
      {
        cwd: master.root,
        env: { ...process.env, master: env }
      }
    );

    if (stdout) console.log(`  Output:`, stdout.trim());
    if (stderr && stderr.trim()) console.error(`  Warnings:`, stderr.trim());

    console.log(`  ✅ Migration '${migrationName}' created for ${contextName}`);

    return {
      success: true,
      message: `Migration created for ${contextName}`
    };

  } catch (err) {
    console.error(`  ❌ Failed to create migration for ${contextName}:`, err.message);

    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  runMigrations,
  enableMigrations,
  addMigration
};
