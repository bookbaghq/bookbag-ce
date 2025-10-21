'use client';

import api from "../apiConfig.json"
const BASE = api.ApiConfig.main;

export default class UserService {
    _isLoading = false;

    get isLoading() {
        return this._isLoading;
    }

    set isLoading(data) {
        this._isLoading = data
    }

    async create(formData) {

        try {
            var url = `${BASE}/${api.ApiConfig.users.create.url}`;
            return await this.ajaxCall(url, api.ApiConfig.users.create.method, JSON.stringify(formData));
        }
        catch (error) {
            return {
                error: error
            }
        }
    }

    async updateRoleAll(formData) {
        try {
            var url = `${BASE}/${api.ApiConfig.users.updateRoleAll.url}`;
            return await this.ajaxCall(url, api.ApiConfig.users.updateRoleAll.method, JSON.stringify(formData));
        }
        catch (error) {
            return {
                error: error
            }
        }
    }

    async update(formData) {

        try {
            var url = `${BASE}/${api.ApiConfig.users.update.url}`;
            return await this.ajaxCall(url, api.ApiConfig.users.update.method, JSON.stringify(formData));
        }
        catch (error) {
            return {
                error: error
            }
        }
    }

    async delete(data) {
        // make ajax call to get the state
        try {
            var url = `${BASE}/${api.ApiConfig.users.delete.url}`;
            this.isLoading = true;
            var res = await this.ajaxCall(url, api.ApiConfig.users.delete.method, JSON.stringify(data));
            this.isLoading = false;

            if (res) {
                return {
                    res: res.userList,
                    error: false
                }
            }
            else {
                return {
                    res: [],
                    error: false
                }
            }

        }
        catch (error) {
            return {
                error: error
            }
        }
    }

    async ajaxCallGet(url, type) {
        var res = await fetch(url, {
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

    getState() {
        return {
            isAuthenticated: this.isAuthenticated,
            isLoading: this.isLoading
        };
    }

}

