const master = require('mastercontroller');

class MailDeliveryService {
    constructor(mailContext) {
        this._mailContext = mailContext;
    }

    _getProviderString(ctx) {
        try {
            const context = ctx || this._mailContext;
            const smtp = context.MailSmtpConnection
                .where(c => c.is_active == $$ && c.is_backup == $$, 1, 0)
                .single() || context.MailSmtpConnection.where(c => c.is_active == $$, 1).single();
            return smtp ? (smtp.host || 'smtp') : 'localhost';
        } catch (_) {
            return 'smtp';
        }
    }

    _getTransportConfig(ctx) {
        const context = ctx || this._mailContext;
        const smtp = context.MailSmtpConnection
            .where(c => c.is_active == $$ && c.is_backup == $$, 1, 0)
            .single() || context.MailSmtpConnection.where(c => c.is_active == $$, 1).single();
        return smtp ? {
            host: smtp.host,
            port: parseInt(smtp.port || 25),
            secure: !!smtp.secure,
            auth: (smtp.auth_user && smtp.auth_pass) ? { user: smtp.auth_user, pass: smtp.auth_pass } : undefined
        } : { host: 'localhost', port: 25, secure: false };
    }

    _getFrom(ctx) {
        const context = ctx || this._mailContext;
        const settings = context.MailSettings.orderByDescending(s => s.id).take(1).single();
        const fromName = settings?.from_name || 'Mail';
        const fromEmail = settings?.from_email || 'noreply@example.com';
        return `${fromName} <${fromEmail}>`;
    }

    async send(context, payload, templateSpec, services = {}) {
        // Strict API: send(ctx, { to }, { name, ...data })
        const ctx = context || this._mailContext;
        const to = payload?.to;
        const spec = templateSpec || {};
        const templateName = spec.name || '';

        if (!to) return { success: false, error: 'Missing required field: to' };
        if (!templateName) return { success: false, error: 'Missing required field: template name' };

        const templateService = services?.templateService || null;
        if (!templateService || typeof templateService.render !== 'function') {
            return { success: false, error: 'Template service unavailable' };
        }

        // Pass template data through as-is (bespoke templates define their own keys)
        const data = { ...spec };
        delete data.name;
        const rendered = templateService.render(templateName, data);
        if (!rendered || (!rendered.html && !rendered.text) || !rendered.subject) {
            return { success: false, error: 'Template rendered empty content or subject' };
        }

        const subject = rendered.subject;
        const text = rendered.text || undefined;
        const html = rendered.html || undefined;

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport(this._getTransportConfig(ctx));
        try {
            const info = await transporter.sendMail({ from: this._getFrom(ctx), to, subject, text, html });
            this._logResult(ctx, { to, subject, status: 'sent', provider: this._getProviderString(ctx), meta: info });
            return { success: true, info, messageId: info?.messageId || null };
        } catch (e) {
            this._logResult(ctx, { to, subject, status: 'failed', provider: this._getProviderString(ctx), meta: { error: e?.message || 'Error', stack: e?.stack } });
            return { success: true, error: e?.message || 'Failed to send email' };
        }
    }

    async sendWithTemp(context, to, subject, html, text) {
        const ctx = context || this._mailContext;
        if (!to) return { success: false, error: 'Missing required field: to' };
        if (!subject || (!html && !text)) return { success: false, error: 'Missing required fields: subject and one of text or html' };

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport(this._getTransportConfig(ctx));
        try {
            const info = await transporter.sendMail({ from: this._getFrom(ctx), to, subject, text, html });
            this._logResult(ctx, { to, subject, status: 'sent', provider: this._getProviderString(ctx), meta: info });
            return { success: true, info, messageId: info?.messageId || null };
        } catch (e) {
            this._logResult(ctx, { to, subject, status: 'failed', provider: this._getProviderString(ctx), meta: { error: e?.message || 'Error', stack: e?.stack } });
            return { success: false, error: e?.message || 'Failed to send email' };
        }
    }

    _logResult(ctx, { to, subject, status, provider, meta }) {
        const context = ctx || this._mailContext;
        const MailLog = require(`${master.root}/components/mail/app/models/mailLog`);
        const log = new MailLog();
        log.message_id = meta?.messageId || '';
        log.to_email = to;
        log.subject = subject;
        log.status = status;
        log.provider = provider || 'smtp';
        log.meta = JSON.stringify(meta || {});
        log.created_at = Date.now().toString();
        log.updated_at = Date.now().toString();
        context.MailLog.add(log);
        context.saveChanges();
    }
}

module.exports = MailDeliveryService;


// await deliveryService.send({ to }, { name: 'user_email' });
// await deliveryService.send({ to }, { name: 'user_email', firstname: 'Ada', lastName: 'Lovelace' });
// await deliveryService.send({ to, subject, text, html });