'use client';

import api from "../apiConfig.json"

export default class MessageService {
    _isLoading = false;

    get isLoading() {
        return this._isLoading;
    }

    set isLoading(data) {
        this._isLoading = data
    }

    appendObjectToQueryString(url, obj) {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                params.append(key, obj[key]);
            }
        }

        urlObj.search = params.toString();
        return urlObj.toString();
    }

    // Non-streaming method has been removed in favor of streaming implementation

    // NOTE: The following methods have been removed as their corresponding API endpoints
    // were removed during architectural refactoring:
    // - addData() - no longer supported
    // - getPage() - no longer supported  
    // - getAllMessages() - no longer supported
    // - updateMessage() - no longer supported
    // - deleteMessage() - no longer supported
    


    async ajaxCallGet(url, type) {
        var res = await fetch(url, {
            credentials: 'include',
            method: type,
            headers: { 'Content-Type': 'application/json' },
        });
        return await res.json();
    }

    async ajaxCall(url, type, data) {
        var res = await fetch(url, {
            credentials: 'include',
            method: type,
            body: data,
            headers: { 'Content-Type': 'application/json' }
        });

        return await res.json();
    }
}
