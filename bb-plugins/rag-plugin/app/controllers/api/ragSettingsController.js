const master = require('mastercontroller');

/**
 * RAG Settings Controller
 *
 * Manages RAG system configuration settings:
 * - Enable/disable RAG globally
 * - Enable/disable RAG for chats
 * - Enable/disable RAG for workspaces
 */
class ragSettingsController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._ragContext = req.ragContext;
    }

    /**
     * Get RAG settings
     * GET /settings
     */
    async getSettings(obj) {
        try {
            // Try to get existing settings
            let settings = this._ragContext.Settings.single();

            // Create default settings if they don't exist
            if (!settings) {
                const Settings = require('../../models/settings');
                settings = new Settings();
                settings.disable_rag = false;
                settings.disable_rag_chat = false;
                settings.disable_rag_workspace = false;
                settings.created_at = Date.now().toString();
                settings.updated_at = Date.now().toString();
                this._ragContext.Settings.add(settings);
                this._ragContext.saveChanges();
            }

            return this.returnJson({
                success: true,
                settings: {
                    disableRag: settings.disable_rag || false,
                    disableRagChat: settings.disable_rag_chat || false,
                    disableRagWorkspace: settings.disable_rag_workspace || false
                }
            });

        } catch (error) {
            console.error('❌ Error getting RAG settings:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update RAG settings
     * POST /settings
     */
    async updateSettings(obj) {
        try {
            const { disableRag, disableRagChat, disableRagWorkspace } = obj?.params?.formData || {};

            // Try to get existing settings
            let settings = this._ragContext.Settings.single();
            

            if (!settings) {
                const Settings = require('../../models/settings');
                settings = new Settings();
                settings.created_at = Date.now().toString();
                this._ragContext.Settings.add(settings);
            }

            // Update settings
            if (disableRag !== undefined) {
                settings.disable_rag = disableRag;
            }
            if (disableRagChat !== undefined) {
                settings.disable_rag_chat = disableRagChat;
            }
            if (disableRagWorkspace !== undefined) {
                settings.disable_rag_workspace = disableRagWorkspace;
            }
            settings.updated_at = Date.now().toString();

            this._ragContext.saveChanges();

            return this.returnJson({
                success: true,
                settings: {
                    disableRag: settings.disable_rag,
                    disableRagChat: settings.disable_rag_chat,
                    disableRagWorkspace: settings.disable_rag_workspace
                },
                message: 'RAG settings updated successfully'
            });

        } catch (error) {
            console.error('❌ Error updating RAG settings:', error);
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

module.exports = ragSettingsController;
