const master = require('mastercontroller');
const mapObject = require('object-mapper');
class mailController{
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this.beforeAction([], req.authService.validateIsAdmin);
        this._mailContext = req.mailContext;
        this.mailTemplateService = req.mailTemplateService || require('mastercontroller').mailTemplateService;
        this.mailDeliveryService = req.mailDeliveryService || require('mastercontroller').mailDeliveryService;
    }

    async logs(obj){
        try{
            const page = parseInt(obj.params?.query.page);
            const limit = parseInt(obj.params?.query.limit) || 50;
            const offset = (page - 1) * limit;

            // Optional filters
            const status = obj.params?.query.status;
            const q = obj.params?.query.q
            const to = obj.params?.query.to
            const provider = obj.params?.query.provider;

            let query = this._mailContext.MailLog;
            if (status) {
                query = query.where(l => l.status == $$, status);
            }
            if (q) {
                query = query.where(l => l.subject.like($$), `%${q}%`);
            }
            if (to) {
                query = query.where(l => l.to_email.like($$), `%${to}%`);
            }
            if (provider) {
                query = query.where(l => l.provider.like($$), `%${provider}%`);
            }

            const list = query
                .orderByDescending(l => l.created_at)
                .take(limit)
                .skip(offset)
                .toList();

            // Map ORM entities to plain JSON to avoid circular structures
            const map = {
                'id': 'id',
                'message_id': 'message_id',
                'to_email': 'to_email',
                'subject': 'subject',
                'status': 'status',
                'provider': 'provider',
                'meta': 'meta',
                'created_at': 'created_at',
                'updated_at': 'updated_at'
            };
            const logs = Array.isArray(list) ? list.map(item => mapObject(item, map)) : [];

            const hasMore = logs.length >= limit; // heuristic, true if we filled the page
            return this.returnJson({ success: true, logs, page, limit, hasMore });
        }catch(e){
            return this.returnJson({ success: false, error: e?.message || 'Failed to load logs' });
        }
    }

    async deleteLog(obj){
        try{
            const id = parseInt(obj.params?.id || obj.params?.logId);
            if (!id) return this.returnJson({ success:false, error: 'ID required' });
            const log = this._mailContext.MailLog.where(l => l.id == $$, id).single();
            if (!log) return this.returnJson({ success:false, error: 'Not found' });
            this._mailContext.MailLog.remove(log);
            this._mailContext.saveChanges();
            return this.returnJson({ success:true });
        }catch(e){
            return this.returnJson({ success:false, error: e?.message || 'Failed to delete log' });
        }
    }

    async sendTest(obj){
        try{
            const nodemailer = require('nodemailer');
            const body = obj.params?.formData || obj.params || obj.body || {};
            const to = body.toEmail || obj.params?.toEmail;
            if(!to){ return this.returnJson({ success:false, error: 'To email is required' }); }

            const smtp = this._mailContext.MailSmtpConnection
                .where(c => c.is_active == $$ && c.is_backup == $$, 1, 0)
                .single() || this._mailContext.MailSmtpConnection.where(c => c.is_active == $$, 1).single();

            const settings = this._mailContext.MailSettings.orderByDescending(s => s.id).take(1).single();
            const fromName = settings?.from_name || 'Mail';
            const fromEmail = settings?.from_email || 'noreply@example.com';

            const transportCfg = smtp ? {
                host: smtp.host,
                port: parseInt(smtp.port || 25),
                secure: !!smtp.secure,
                auth: (smtp.auth_user && smtp.auth_pass) ? { user: smtp.auth_user, pass: smtp.auth_pass } : undefined
            } : { host: 'localhost', port: 25, secure: false };

            const transporter = nodemailer.createTransport(transportCfg);
            const info = await transporter.sendMail({
                from: `${fromName} <${fromEmail}>`,
                to,
                subject: 'Test Email',
                text: 'This is a test email',
                html: '<b>This is a test email</b>'
            });

            const MailLog = require(`${master.root}/components/mail/app/models/mailLog`);
            const log = new MailLog();
            log.message_id = info?.messageId || '';
            log.to_email = to;
            log.subject = 'Test Email';
            log.status = 'sent';
            log.provider = smtp ? (smtp.host || 'smtp') : 'localhost';
            log.meta = JSON.stringify(info || {});
            log.created_at = Date.now().toString();
            log.updated_at = Date.now().toString();
            this._mailContext.MailLog.add(log);
            this._mailContext.saveChanges();

			return this.returnJson({ success: true, messageId: info?.messageId || null });
		}catch(e){
			// Log failure
			try {
				const body = obj.params?.formData || obj.params || obj.body || {};
				const to = body.to || obj.params?.to || '';
				let provider = 'smtp';
				try {
					const smtp = this._mailContext.MailSmtpConnection
						.where(c => c.is_active == $$ && c.is_backup == $$, 1, 0)
						.single() || this._mailContext.MailSmtpConnection.where(c => c.is_active == $$, 1).single();
					provider = smtp ? (smtp.host || 'smtp') : 'localhost';
				} catch(_) {}
				const MailLog = require(`${master.root}/components/mail/app/models/mailLog`);
				const log = new MailLog();
				log.message_id = '';
				log.to_email = to;
				log.subject = 'Test Email';
				log.status = 'failed';
				log.provider = provider;
				log.meta = JSON.stringify({ error: e?.message || 'Error', stack: e?.stack });
				log.created_at = Date.now().toString();
				log.updated_at = Date.now().toString();
				this._mailContext.MailLog.add(log);
				this._mailContext.saveChanges();
			} catch(_) {}
			return this.returnJson({ success:false, error: e?.message || 'Failed to send test email' });
		}

    }

	// POST mail/api/send
	async send(obj){
		try{
			const body = obj.params?.formData || obj.params || obj.body || {};
			const to = body.to || body.to_email || obj.params?.to;
			// Support either direct subject/text/html OR a template key with data
			const templateKey = body.templateKey || body.template || null;
			const templateData = body.data || {};
			const subject = body.subject || '';
			const text = body.text || '';
			const html = body.html || body.body_html || undefined;

			const result = await this.mailDeliveryService.send(this._mailContext, { to, subject, text, html }, { name: templateKey, ...templateData }, { templateService: this.mailTemplateService });
			return this.returnJson({ success: !!result?.success, messageId: result?.messageId || null, error: result?.error || null });
		}catch(e){
			return this.returnJson({ success:false, error: e?.message || 'Failed to send email' });
		}
	}

    returnJson(o){ return o; }
}

module.exports = mailController;

