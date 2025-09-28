const fs = require('fs');
const path = require('path');

class MailTemplateService {
    constructor(configPath) {
        this.configPath = configPath;
        this.templates = {};
        this._load();
    }

    _load() {
        try {
            const raw = fs.readFileSync(this.configPath, 'utf-8');
            this.templates = JSON.parse(raw) || {};
        } catch (e) {
            this.templates = {};
        }
    }

    reload() { this._load(); }

    // Very basic {{var}} interpolation
    _interpolate(str, data) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
            const val = data && Object.prototype.hasOwnProperty.call(data, key) ? data[key] : '';
            return (val == null) ? '' : String(val);
        });
    }

    render(templateKey, data = {}) {
        const tpl = this.templates[templateKey];
        if (!tpl) return null;
        const subject = this._interpolate(tpl.subject || '', data);
        const html = this._interpolate(tpl.html || '', data);
        const text = tpl.text ? this._interpolate(tpl.text, data) : undefined;
        return { subject, html, text };
    }
}

module.exports = MailTemplateService;


