'use client';

import api from "../apiConfig.json";
const BASE = api.ApiConfig.main;

export default class ApiKeyService {
    _isLoading = false;

    get isLoading() {
        return this._isLoading;
    }

    set isLoading(data) {
        this._isLoading = data;
    }

    /**
     * List all API keys
     */
    async list() {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/list`;
            const res = await this.ajaxCallGet(url, 'GET');
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Get single API key by ID
     */
    async get(id) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/${id}`;
            const res = await this.ajaxCallGet(url, 'GET');
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Create new API key
     */
    async create(formData) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api`;
            const res = await this.ajaxCall(url, 'POST', JSON.stringify(formData));
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Update API key
     */
    async update(id, formData) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/${id}`;
            const res = await this.ajaxCall(url, 'PUT', JSON.stringify(formData));
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Delete API key
     */
    async delete(id) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/${id}`;
            const res = await this.ajaxCall(url, 'DELETE', null);
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Toggle API key active status
     */
    async toggle(id) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/${id}/toggle`;
            const res = await this.ajaxCall(url, 'POST', null);
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Regenerate API key
     */
    async regenerate(id) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/${id}/regenerate`;
            const res = await this.ajaxCall(url, 'POST', null);
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * List all sessions
     */
    async listSessions() {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/sessions/list`;
            const res = await this.ajaxCallGet(url, 'GET');
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Get single session by ID
     */
    async getSession(id) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/sessions/${id}`;
            const res = await this.ajaxCallGet(url, 'GET');
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Delete session
     */
    async deleteSession(id) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/sessions/${id}`;
            const res = await this.ajaxCall(url, 'DELETE', null);
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Clear sessions by API ID
     */
    async clearSessionsByApi(apiId) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/sessions/${apiId}/clear`;
            const res = await this.ajaxCall(url, 'POST', null);
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Get settings
     */
    async getSettings() {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/settings`;
            const res = await this.ajaxCallGet(url, 'GET');
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Update settings
     */
    async updateSettings(formData) {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-api/api/settings`;
            const res = await this.ajaxCall(url, 'POST', JSON.stringify(formData));
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    /**
     * Get available models for API key creation
     */
    async getModels() {
        try {
            this.isLoading = true;
            const url = `${BASE}/bb-models/api/models/getPublishedModels`;
            const res = await this.ajaxCallGet(url, 'GET');
            this.isLoading = false;
            return res;
        } catch (error) {
            this.isLoading = false;
            return { error: error.message };
        }
    }

    async ajaxCallGet(url, type) {
        const res = await fetch(url, {
            credentials: 'include',
            method: type,
            headers: { 'Content-Type': 'application/json' }
        });
        return await res.json();
    }

    async ajaxCall(url, type, data) {
        const options = {
            credentials: 'include',
            method: type,
            headers: { 'Content-Type': 'application/json' }
        };

        if (data) {
            options.body = data;
        }

        const res = await fetch(url, options);
        return await res.json();
    }

    getState() {
        return {
            isLoading: this.isLoading
        };
    }
}
