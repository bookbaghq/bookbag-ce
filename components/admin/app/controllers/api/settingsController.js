/**
 * Settings Controller
 * Manages plugin/feature settings
 */

const master = require('mastercontroller');

class settingsController {
  constructor(req) {
    this._currentUser = req.authService.currentUser(req.request, req.userContext);
    this._adminContext = req.adminContext;
  }

  returnJson(obj) { return obj; }

  /**
   * Get settings
   * GET /api/admin/settings
   */
  async getSettings(obj) {
    try {
      // Try to get existing settings
      let setting = this._adminContext.Setting.single();

      // Create default settings if they don't exist
      if (!setting) {
        const Setting = require('../../models/setting');
        setting = new Setting();
        const dateNow = Date.now().toString();
        setting.created_at = dateNow;
        setting.updated_at = dateNow;
        setting.disable_client_side = false;
        this._adminContext.Setting.add(setting);
        this._adminContext.saveChanges();
      }

      return this.returnJson({
        success: true,
        settings: {
          disable_client_side: setting.disable_client_side,
          plugin_upload_max_file_size: setting.plugin_upload_max_file_size || 104857600, // Default 100MB
        }
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      return this.returnJson({
        success: false,
        error: 'Failed to fetch settings'
      });
    }
  }

  /**
   * Update settings
   * POST /api/admin/settings
   */
  async updateSettings(obj) {
    try {
      const { disable_client_side, plugin_upload_max_file_size } = obj.params.formData || obj.params || {};

      // Get or create settings record (singleton pattern)
      let setting = this._adminContext.Setting.single();

      if (!setting) {
        // Create new settings record
        const Setting = require('../../models/setting');
        setting = new Setting();
        const dateNow = Date.now().toString();
        setting.created_at = dateNow;
        setting.updated_at = dateNow;
        setting.disable_client_side = disable_client_side !== undefined ? disable_client_side : false;
        setting.plugin_upload_max_file_size = plugin_upload_max_file_size !== undefined ? plugin_upload_max_file_size : 104857600;

        this._adminContext.Setting.add(setting);
      } else {
        // Update existing settings
        if (disable_client_side !== undefined) setting.disable_client_side = disable_client_side;
        if (plugin_upload_max_file_size !== undefined) setting.plugin_upload_max_file_size = plugin_upload_max_file_size;
        setting.updated_at = Date.now().toString();
      }

      this._adminContext.saveChanges();

      return this.returnJson({
        success: true,
        message: 'Settings updated successfully',
        settings: {
          disable_client_side: setting.disable_client_side,
          plugin_upload_max_file_size: setting.plugin_upload_max_file_size,
        }
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      return this.returnJson({
        success: false,
        error: 'Failed to update settings'
      });
    }
  }
}

module.exports = settingsController;
