'use client';

import api from "../apiConfig.json";

export default class ChatService {
    _isLoading = false;

    get isLoading() {
        return this._isLoading;
    }

    set isLoading(data) {
        this._isLoading = data;
    }

    appendObjectToQueryString(url, obj) {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const val = obj[key];
                if (Array.isArray(val)) {
                    val.forEach(v => params.append(key, String(v)));
                } else if (typeof val !== 'undefined' && val !== null) {
                    params.append(key, String(val));
                }
            }
        }
        urlObj.search = params.toString();
        return urlObj.toString();
    }

    async adminSearchChats({ q = '', userIds = [], limit = 50 } = {}) {
        const base = `${api.ApiConfig.main}/${api.ApiConfig.chat.adminSearch.url}`;
        const url = this.appendObjectToQueryString(base, {
            q,
            userIds: Array.isArray(userIds) ? userIds.join(',') : userIds,
            limit
        });
        return await this.ajaxCallGet(url, api.ApiConfig.chat.adminSearch.method);
    }

    async adminGetChatById(chatId) {
        const path = api.ApiConfig.chat.adminGetById.url.replace(':chatId', encodeURIComponent(String(chatId)));
        const url = `${api.ApiConfig.main}/${path}`;
        return await this.ajaxCallGet(url, api.ApiConfig.chat.adminGetById.method);
    }

  async deleteChat(chatId) {
    const path = api.ApiConfig.chat.delete.url.replace(':chatId', encodeURIComponent(String(chatId)));
    const url = `${api.ApiConfig.main}/${path}`;
    return await this.ajaxCall(url, api.ApiConfig.chat.delete.method);
  }

  async adminCreateChat({ title, userIds }) {
    const url = `${api.ApiConfig.main}/${api.ApiConfig.chat.adminCreate.url}`;
    const payload = JSON.stringify({ title, userIds });
    return await this.ajaxCall(url, api.ApiConfig.chat.adminCreate.method, payload);
  }

  async adminDeleteChat(chatId) {
    const path = api.ApiConfig.chat.adminDelete.url.replace(':chatId', encodeURIComponent(String(chatId)));
    const url = `${api.ApiConfig.main}/${path}`;
    return await this.ajaxCall(url, api.ApiConfig.chat.adminDelete.method);
  }

    async ajaxCallGet(url, type) {
        const res = await fetch(url, {
            credentials: 'include',
            method: type,
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    }

    async ajaxCall(url, type, data) {
        const res = await fetch(url, {
            credentials: 'include',
            method: type,
            body: data,
            headers: { 'Content-Type': 'application/json' }
        });
        return await res.json();
    }
}


