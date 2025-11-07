/**
 * Chat Settings Controller
 *
 * Manages chat system configuration settings:
 * - Allow only workspace creation
 */
class chatSettingsController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._chatContext = req.chatContext;
    }

    /**
     * Get chat settings
     * GET /settings
     */
    async getSettings(obj) {
        try {
            // Try to get existing settings
            let settings = this._chatContext.Settings.single();

            // Create default settings if they don't exist
            if (!settings) {
                const Settings = require('../../models/settings');
                settings = new Settings();
                settings.disable_chat_creation = 0;
                settings.created_at = Date.now().toString();
                settings.updated_at = Date.now().toString();
                this._chatContext.Settings.add(settings);
                this._chatContext.saveChanges();
            }

            return this.returnJson({
                success: true,
                settings: {
                    disableChatCreation: settings.disable_chat_creation === 1
                }
            });

        } catch (error) {
            console.error('❌ Error getting chat settings:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update chat settings
     * POST /settings
     */
    async updateSettings(obj) {
        try {
            const { disableChatCreation } = obj?.params?.formData || {};

            // Try to get existing settings
            let settings = this._chatContext.Settings.single();

            if (!settings) {
                const Settings = require('../../models/settings');
                settings = new Settings();
                settings.created_at = Date.now().toString();
                this._chatContext.Settings.add(settings);
            }

            // Update settings
            if (disableChatCreation !== undefined) {
                settings.disable_chat_creation = disableChatCreation ? 1 : 0;
            }
            settings.updated_at = Date.now().toString();

            this._chatContext.saveChanges();

            return this.returnJson({
                success: true,
                settings: {
                    disableChatCreation: settings.disable_chat_creation === 1
                },
                message: 'Chat settings updated successfully'
            });

        } catch (error) {
            console.error('❌ Error updating chat settings:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    returnJson(obj) {
        return obj;
    }
}

module.exports = chatSettingsController;
