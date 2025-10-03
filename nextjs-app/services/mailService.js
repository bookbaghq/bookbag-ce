"use client";

import api from "../apiConfig.json";
import getBackendBaseUrl from "../lib/backendUrl";
const BASE = getBackendBaseUrl();

export default class MailService {
    _isLoading = false;

    get isLoading() { return this._isLoading; }
    set isLoading(v) { this._isLoading = v; }

    async getSettings() {
        const url = `${BASE}/${api.ApiConfig.mail.settingsGet.url}`;
        return await this.ajaxGet(url, api.ApiConfig.mail.settingsGet.method);
    }

    async saveSettings(payload) {
        const url = `${BASE}/${api.ApiConfig.mail.settingsSave.url}`;
        return await this.ajax(url, api.ApiConfig.mail.settingsSave.method, JSON.stringify(payload));
    }

    async listSmtp() {
        const url = `${BASE}/${api.ApiConfig.mail.smtpList.url}`;
        return await this.ajaxGet(url, api.ApiConfig.mail.smtpList.method);
    }

    async saveSmtp(conn) {
        const url = `${BASE}/${api.ApiConfig.mail.smtpSave.url}`;
        return await this.ajax(url, api.ApiConfig.mail.smtpSave.method, JSON.stringify(conn));
    }

    async deleteSmtp(id) {
        const path = api.ApiConfig.mail.smtpDelete.url.replace(':id', encodeURIComponent(String(id)));
        const url = `${BASE}/${path}`;
        return await this.ajax(url, api.ApiConfig.mail.smtpDelete.method);
    }

    async getLogs() {
        const url = `${BASE}/${api.ApiConfig.mail.logs.url}`;
        return await this.ajaxGet(url, api.ApiConfig.mail.logs.method);
    }

    async getLogsPage({ page = 1, limit = 50, status, q, to, provider } = {}) {
        const urlObj = new URL(`${BASE}/${api.ApiConfig.mail.logs.url}`);
        urlObj.searchParams.set('page', String(page));
        urlObj.searchParams.set('limit', String(limit));
        if (status) urlObj.searchParams.set('status', status);
        if (q) urlObj.searchParams.set('q', q);
        if (to) urlObj.searchParams.set('to', to);
        if (provider) urlObj.searchParams.set('provider', provider);
        return await this.ajaxGet(urlObj.toString(), api.ApiConfig.mail.logs.method);
    }

    async deleteLog(id) {
        const path = api.ApiConfig.mail.logsDelete?.url?.replace(':id', encodeURIComponent(String(id))) || `bb-mail/api/logs/${encodeURIComponent(String(id))}`;
        const url = `${BASE}/${path}`;
        const method = api.ApiConfig.mail.logsDelete?.method || 'delete';
        return await this.ajax(url, method);
    }

    async sendTest({ toEmail, subject, text, html }) {
        const url = `${BASE}/${api.ApiConfig.mail.sendTest.url}`;
        return await this.ajax(url, api.ApiConfig.mail.sendTest.method, JSON.stringify({ toEmail, subject, text, html }));
    }

    async send(payload) {
        const url = `${BASE}/${api.ApiConfig.mail.send.url}`;
        return await this.ajax(url, api.ApiConfig.mail.send.method, JSON.stringify(payload));
    }

    async getGeneralSettings() {
        const url = `${BASE}/${api.ApiConfig.mail.settingsGet.url}`;
        return await this.ajaxGet(url, api.ApiConfig.mail.settingsGet.method);
    }

    async ajaxGet(url, method) {
        const res = await fetch(url, { credentials: 'include', method, headers: { 'Content-Type': 'application/json' } });
        return await res.json();
    }

    async ajax(url, method, body) {
        const res = await fetch(url, { credentials: 'include', method, body, headers: { 'Content-Type': 'application/json' } });
        return await res.json();
    }
}


