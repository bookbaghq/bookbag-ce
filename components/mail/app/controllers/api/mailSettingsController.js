const master = require('mastercontroller');

class mailSettingsController {

    constructor(req){
        this.beforeAction([], req.authService.validateIsAdmin);
        this._mailContext = req.mailContext;
    }

    async get(obj){
        try{
            const settings = this._mailContext.MailSettings.orderByDescending(s => s.id).take(1).single();
            var j = {
                id: settings?.id,
                from_name: settings?.from_name,
                from_email: settings?.from_email,
                return_path_matches_from: !!settings?.return_path_matches_from,
                weekly_summary_enabled: !!settings?.weekly_summary_enabled,
                created_at: settings?.created_at,
                updated_at: settings?.updated_at
            }
            return this.returnJson({ success: true, settings: j });
        }catch(e){
            return this.returnJson({ success: false, error: e?.message || 'Failed to load settings' });
        }
    }

    async save(obj){
        try{
            const body = obj.params?.formData || obj.params || obj.body || {};
            const name = body.from_name
            const email = body.from_email 
            if (!name) {
                return this.returnJson({ success: false, error: 'From Name is required' });
            }
            // Basic email validation
            const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
            if (!emailOk) {
                return this.returnJson({ success: false, error: 'From Email is required and must be valid' });
            }
            const MailSettings = require(`${master.root}/components/mail/app/models/mailSettings`);
            // Always upsert a single settings record
            let settings = null;
            try { settings = this._mailContext.MailSettings.single(); } catch(_) { settings = null; }
            const isNew = !settings;
            if (!settings) settings = new MailSettings();
            settings.from_name = name || settings.from_name || '';
            settings.from_email = email || settings.from_email || '';
            settings.return_path_matches_from = !!(body.return_path_matches_from || body.returnPathMatchesFrom);
            settings.weekly_summary_enabled = !!(body.weekly_summary_enabled || body.weeklySummaryEnabled);
            settings.updated_at = Date.now().toString();
            if (isNew) {
                settings.created_at = settings.updated_at;
                this._mailContext.MailSettings.add(settings);
            }
            this._mailContext.saveChanges();
            return this.returnJson({ success: true });
        }catch(e){
            return this.returnJson({ success:false, error: e?.message || 'Failed to save settings' });
        }
    }

    async listSmtp(obj){
        try{
            const list = this._mailContext.MailSmtpConnection.single();
            var j = {
                id: list.id,
                host: list.host,
                port: list.port,
                secure: list.secure,
                auth_user: list.auth_user,
                // Return the actual password so the UI can mask it but reveal on demand
                auth_pass: list.auth_pass || '',
                is_backup: list.is_backup,
                is_active: list.is_active,
                created_at: list.created_at,
                updated_at: list.updated_at
            }
            return this.returnJson({ success: true, smtp: j });
        }catch(e){
            return this.returnJson({ success:false, error: e?.message || 'Failed to load SMTP connections' });
        }
    }

    async saveSmtp(obj){
        try{
            const body = obj.params?.formData || obj.params || obj.body || {};
            const id = body.id ? parseInt(body.id) : null;
            const MailSmtpConnection = require(`${master.root}/components/mail/app/models/mailSmtpConnection`);
            let conn = null;
            if (id) {
                conn = this._mailContext.MailSmtpConnection.where(c => c.id == $$, id).single();
            }
            // If no id or not found, attempt to load the existing single record (there should only be one)
            if (!conn) {
                try { conn = this._mailContext.MailSmtpConnection.single(); } catch (_) { conn = null; }
            }
            const isNew = !conn;
            if (!conn) conn = new MailSmtpConnection();
            if (typeof body.host !== 'undefined') conn.host = String(body.host || '');
            if (typeof body.port !== 'undefined') conn.port = parseInt(body.port || 25);
            if (typeof body.secure !== 'undefined') conn.secure = !!body.secure;
            if (typeof body.auth_user !== 'undefined') conn.auth_user = body.auth_user || '';
            if (typeof body.auth_pass !== 'undefined') conn.auth_pass = body.auth_pass || '';
            if (typeof body.is_backup !== 'undefined') conn.is_backup = !!body.is_backup;
            if (typeof body.is_active !== 'undefined') conn.is_active = !!body.is_active;
            conn.updated_at = Date.now().toString();
            if (isNew) {
                conn.created_at = conn.updated_at;
                this._mailContext.MailSmtpConnection.add(conn);
            }
            this._mailContext.saveChanges();
            return this.returnJson({ success: true, id: conn.id });
        }catch(e){
            return this.returnJson({ success:false, error: e?.message || 'Failed to save SMTP connection' });
        }
    }
    
    returnJson(o){ return o; }
}

module.exports = mailSettingsController;


