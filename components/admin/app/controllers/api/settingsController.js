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
        setting.is_rag_active = true;
        setting.is_mail_active = true;
        setting.is_user_active = true;
        setting.is_workspace_active = true;
        setting.is_media_active = true;

        this._adminContext.Setting.add(setting);
        this._adminContext.saveChanges();
      }

      return this.returnJson({
        success: true,
        settings: {
          is_rag_active: setting.is_rag_active !== false,
          is_mail_active: setting.is_mail_active !== false,
          is_user_active: setting.is_user_active !== false,
          is_workspace_active: setting.is_workspace_active !== false,
          is_media_active: setting.is_media_active !== false
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
      const { is_rag_active, is_mail_active, is_user_active, is_workspace_active, is_media_active } = obj.params.formData || obj.params || {};

      // Get or create settings record (singleton pattern)
      let setting = this._adminContext.Setting.single();

      if (!setting) {
        // Create new settings record
        const Setting = require('../../models/setting');
        setting = new Setting();
        const dateNow = Date.now().toString();
        setting.created_at = dateNow;
        setting.updated_at = dateNow;
        setting.is_rag_active = is_rag_active !== undefined ? is_rag_active : true;
        setting.is_mail_active = is_mail_active !== undefined ? is_mail_active : true;
        setting.is_user_active = is_user_active !== undefined ? is_user_active : true;
        setting.is_workspace_active = is_workspace_active !== undefined ? is_workspace_active : true;
        setting.is_media_active = is_media_active !== undefined ? is_media_active : true;

        this._adminContext.Setting.add(setting);
      } else {
        // Update existing settings
        if (is_rag_active !== undefined) setting.is_rag_active = is_rag_active;
        if (is_mail_active !== undefined) setting.is_mail_active = is_mail_active;
        if (is_user_active !== undefined) setting.is_user_active = is_user_active;
        if (is_workspace_active !== undefined) setting.is_workspace_active = is_workspace_active;
        if (is_media_active !== undefined) setting.is_media_active = is_media_active;
        setting.updated_at = Date.now().toString();
      }

      this._adminContext.saveChanges();

      return this.returnJson({
        success: true,
        message: 'Settings updated successfully',
        settings: {
          is_rag_active: setting.is_rag_active,
          is_mail_active: setting.is_mail_active,
          is_user_active: setting.is_user_active,
          is_workspace_active: setting.is_workspace_active,
          is_media_active: setting.is_media_active
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
