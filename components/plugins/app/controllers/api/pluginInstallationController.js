/**
 * Plugin Installation Controller
 * WordPress-style plugin upload and installation system
 *
 * Handles:
 * - Plugin upload (zip files)
 * - Validation (plugin.json manifest)
 * - Extraction to bb-plugins directory
 * - Database record creation
 * - Plugin deletion (files + database)
 */

const master = require('mastercontroller');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const pluginEntity = require("./../../models/plugin");

class pluginInstallationController {

  constructor(req) {
    this._currentUser = req.authService.currentUser(req.request, req.userContext);
    this._adminContext = req.adminContext;
    this._pluginContext = req.pluginContext;
  }

  returnJson(obj) {
    return obj;
  }

  /**
   * Upload and install a new plugin
   * POST /api/plugins/upload
   *
   * Form data:
   * - pluginFile: ZIP file containing plugin
   *
   * Expected ZIP structure:
   * plugin-name.zip
   * └── plugin-name/
   *     ├── plugin.json (required)
   *     ├── index.js
   *     └── ... other files
   */
  async uploadPlugin(req, res) {
    try {
      // Check if file was uploaded (MasterController pattern)
      const fileList = req.params.formData.files;

      if (!fileList || Object.keys(fileList).length === 0) {
        return this.returnJson({
          success: false,
          error: 'No plugin file uploaded. Please select a ZIP file.'
        });
      }

      // Get the first file (assuming single file upload for plugin)
      const firstFileKey = Object.keys(fileList)[0];
      const fileItem = fileList[firstFileKey];

      if (!fileItem || !fileItem[0]) {
        return this.returnJson({
          success: false,
          error: 'No plugin file uploaded. Please select a ZIP file.'
        });
      }

      const pluginFile = fileItem[0];

      // Validate file type
      const fileName = pluginFile.originalFilename || pluginFile.name || '';
      if (!fileName.endsWith('.zip')) {
        return this.returnJson({
          success: false,
          error: 'Invalid file type. Please upload a ZIP file.'
        });
      }

      // Check file size against dynamic limit from settings
      try {
        const settings = this._adminContext.Setting.single()
        const maxFileSize = settings?.plugin_upload_max_file_size || 104857600; // Default 100MB

        if (pluginFile.size > maxFileSize) {
          const fileSizeMB = (pluginFile.size / 1048576).toFixed(2);
          const maxSizeMB = (maxFileSize / 1048576).toFixed(2);
          return this.returnJson({
            success: false,
            error: `File size (${fileSizeMB} MB) exceeds the maximum allowed size of ${maxSizeMB} MB. Please upload a smaller plugin file or contact your administrator to increase the upload limit.`
          });
        }
      } catch (settingsError) {
        console.error('Error checking file size limit:', settingsError);
        // Continue with default limit if settings check fails
        const defaultLimit = 104857600; // 100MB
        if (pluginFile.size > defaultLimit) {
          const fileSizeMB = (pluginFile.size / 1048576).toFixed(2);
          return this.returnJson({
            success: false,
            error: `File size (${fileSizeMB} MB) exceeds the default maximum of 100 MB.`
          });
        }
      }

      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, '../../../../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Get the source file path (MasterController stores files with filepath or path property)
      const sourceFilePath = pluginFile.filepath || pluginFile.path;

      if (!sourceFilePath || !fs.existsSync(sourceFilePath)) {
        return this.returnJson({
          success: false,
          error: 'Uploaded file not found. Please try again.'
        });
      }

      // Copy uploaded file to temp directory
      const tempFilePath = path.join(tempDir, `plugin-${Date.now()}.zip`);
      fs.copyFileSync(sourceFilePath, tempFilePath);

      try {
        // Extract and validate ZIP
        const zip = new AdmZip(tempFilePath);
        const zipEntries = zip.getEntries();

        if (zipEntries.length === 0) {
          throw new Error('ZIP file is empty');
        }

        // Find plugin.json in the ZIP
        let pluginJsonEntry = null;
        let pluginRootDir = null;

        for (const entry of zipEntries) {
          if (entry.entryName.endsWith('plugin.json') && !entry.entryName.includes('__MACOSX')) {
            pluginJsonEntry = entry;
            // Extract plugin root directory name
            const parts = entry.entryName.split('/');
            if (parts.length >= 2) {
              pluginRootDir = parts[0];
            }
            break;
          }
        }

        if (!pluginJsonEntry) {
          throw new Error('Invalid plugin: plugin.json not found in ZIP file');
        }

        if (!pluginRootDir) {
          throw new Error('Invalid plugin structure: plugin files must be in a root directory');
        }

        // Parse plugin.json
        const pluginJsonContent = pluginJsonEntry.getData().toString('utf8');
        let pluginMeta;

        try {
          pluginMeta = JSON.parse(pluginJsonContent);
        } catch (e) {
          throw new Error('Invalid plugin.json: ' + e.message);
        }

        // Validate required fields
        if (!pluginMeta.name || !pluginMeta.slug) {
          throw new Error('Invalid plugin.json: name and slug are required');
        }

        // Check if plugin root directory name matches slug
        if (pluginRootDir !== pluginMeta.slug) {
          throw new Error(`Plugin directory name "${pluginRootDir}" must match slug "${pluginMeta.slug}" in plugin.json`);
        }

        // Check if plugin already exists
        const pluginLoader = master.requestList.pluginLoader;
        const existingPlugin = this._pluginContext.Plugin.where(r => r.name == $$,pluginMeta.slug ).single();
        
        if (existingPlugin) {
          throw new Error(`Plugin "${pluginMeta.slug}" is already installed. Please delete it first to reinstall.`);
        }

        // Extract to bb-plugins directory
        const bbPluginsDir = path.join(__dirname, '../../../../../bb-plugins');
        const targetPluginDir = path.join(bbPluginsDir, pluginMeta.slug);

        // Check if directory already exists
        if (fs.existsSync(targetPluginDir)) {
          // Clean up temp file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          return this.returnJson({
            success: false,
            error: `Plugin directory "${pluginMeta.slug}" already exists. Please remove it manually first.`
          });
        }

        // Extract the ZIP (filtering out __MACOSX and other metadata)
        for (const entry of zipEntries) {
          // Skip __MACOSX files, .DS_Store, and other metadata
          if (entry.entryName.includes('__MACOSX') ||
              entry.entryName.includes('.DS_Store') ||
              entry.entryName.startsWith('.')) {
            continue;
          }

          // Only extract entries that belong to the plugin directory
          if (entry.entryName.startsWith(pluginRootDir + '/') || entry.entryName === pluginRootDir) {
            zip.extractEntryTo(entry, bbPluginsDir, true, true);
          }
        }

        // Verify extraction
        if (!fs.existsSync(targetPluginDir)) {
          throw new Error('Plugin extraction failed');
        }

        // Create database record
        // Note: file_path should only contain the plugin folder name (e.g., 'tokens-plugin')
        // The entry file name comes from plugin.json, not from file_path
        const filePath = `/${pluginMeta.slug}`;

        var plugin = new pluginEntity();
        const dateNow = Date.now().toString();
        plugin.name = pluginMeta.slug;
        plugin.label = pluginMeta.name;
        plugin.description = pluginMeta.description || '';
        plugin.file_path = filePath;
        plugin.method_name_to_load = 'load';
        plugin.is_active = 0; // Not active by default
        plugin.priority = pluginMeta.priority || 10;
        plugin.icon = pluginMeta.icon || 'Package';
        plugin.category = pluginMeta.category || 'plugin';
        plugin.version = pluginMeta.version || '1.0.0';
        plugin.author = pluginMeta.author || '';
        plugin.last_error = null;
        plugin.error_count = 0;
        plugin.is_broken = 0;
        plugin.created_at = dateNow;
        plugin.updated_at = dateNow;

        this._pluginContext.Plugin.add(plugin);
        await this._pluginContext.saveChanges();

        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }

        return this.returnJson({
          success: true,
          message: `Plugin "${pluginMeta.name}" installed successfully! Activate it from the Installed Plugins page.`,
          plugin: {
            slug: pluginMeta.slug,
            name: pluginMeta.name,
            version: pluginMeta.version,
            author: pluginMeta.author,
            description: pluginMeta.description
          }
        });

      } catch (error) {
        // Clean up temp file on error
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw error;
      }

    } catch (error) {
      console.error('Error uploading plugin:', error);
      return this.returnJson({
        success: false,
        error: error.message || 'Failed to upload plugin'
      });
    }
  }

  /**
   * Delete a plugin completely (files + database)
   * DELETE /api/plugins/uninstall
   * Body: { pluginName: 'plugin-slug' }
   */
  async uninstallPlugin(req, res) {
    try {
      const pluginName = req.body?.pluginName;

      if (!pluginName) {
        return this.returnJson({
          success: false,
          error: 'Missing plugin name'
        });
      }

      const Plugin = require('../../models/plugin');

      // Check if plugin exists
      const plugin = await Plugin.findOne({ name: pluginName });
      if (!plugin) {
        return this.returnJson({
          success: false,
          error: 'Plugin not found in database'
        });
      }

      // Check if plugin is active
      if (plugin.is_active) {
        return this.returnJson({
          success: false,
          error: 'Cannot delete an active plugin. Please deactivate it first.'
        });
      }

      // Delete plugin directory
      const pluginDir = path.join(__dirname, '../../../../../bb-plugins', pluginName);

      if (fs.existsSync(pluginDir)) {
        // Recursively delete directory
        this.deleteFolderRecursive(pluginDir);
      }

      // Delete database record
      await Plugin.deleteOne({ name: pluginName });

      return this.returnJson({
        success: true,
        message: `Plugin "${pluginName}" has been completely removed.`
      });

    } catch (error) {
      console.error('Error uninstalling plugin:', error);
      return this.returnJson({
        success: false,
        error: error.message || 'Failed to uninstall plugin'
      });
    }
  }

  /**
   * Validate a plugin ZIP without installing
   * POST /api/plugins/validate
   * Form data:
   * - pluginFile: ZIP file to validate
   */
  async validatePlugin(req, res) {
    try {
      if (!req.files || !req.files.pluginFile) {
        return this.returnJson({
          success: false,
          error: 'No plugin file uploaded'
        });
      }

      const pluginFile = req.files.pluginFile;

      if (!pluginFile.name.endsWith('.zip')) {
        return this.returnJson({
          success: false,
          error: 'Invalid file type. Please upload a ZIP file.'
        });
      }

      // Create temp directory
      const tempDir = path.join(__dirname, '../../../../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `validate-${Date.now()}.zip`);
      await pluginFile.mv(tempFilePath);

      try {
        const zip = new AdmZip(tempFilePath);
        const zipEntries = zip.getEntries();

        // Find plugin.json
        let pluginJsonEntry = null;
        let pluginRootDir = null;

        for (const entry of zipEntries) {
          if (entry.entryName.endsWith('plugin.json') && !entry.entryName.includes('__MACOSX')) {
            pluginJsonEntry = entry;
            const parts = entry.entryName.split('/');
            if (parts.length >= 2) {
              pluginRootDir = parts[0];
            }
            break;
          }
        }

        if (!pluginJsonEntry) {
          throw new Error('plugin.json not found in ZIP file');
        }

        // Parse plugin.json
        const pluginJsonContent = pluginJsonEntry.getData().toString('utf8');
        const pluginMeta = JSON.parse(pluginJsonContent);

        // Validate required fields
        const errors = [];
        if (!pluginMeta.name) errors.push('Missing required field: name');
        if (!pluginMeta.slug) errors.push('Missing required field: slug');
        if (!pluginRootDir) errors.push('Invalid structure: plugin must be in a root directory');
        if (pluginRootDir && pluginMeta.slug && pluginRootDir !== pluginMeta.slug) {
          errors.push(`Directory name "${pluginRootDir}" must match slug "${pluginMeta.slug}"`);
        }

        // Check if already installed
        const Plugin = require('../../models/plugin');
        if (pluginMeta.slug) {
          const existing = await Plugin.findOne({ name: pluginMeta.slug });
          if (existing) {
            errors.push(`Plugin "${pluginMeta.slug}" is already installed`);
          }
        }

        // Clean up
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }

        if (errors.length > 0) {
          return this.returnJson({
            success: false,
            errors,
            plugin: pluginMeta
          });
        }

        return this.returnJson({
          success: true,
          message: 'Plugin is valid and ready to install',
          plugin: pluginMeta
        });

      } catch (error) {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw error;
      }

    } catch (error) {
      console.error('Error validating plugin:', error);
      return this.returnJson({
        success: false,
        error: error.message || 'Failed to validate plugin'
      });
    }
  }

  /**
   * Helper method to recursively delete a directory
   */
  deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
      fs.readdirSync(folderPath).forEach((file) => {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(folderPath);
    }
  }
}

module.exports = pluginInstallationController;
