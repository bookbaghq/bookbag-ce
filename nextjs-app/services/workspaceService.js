'use client';

import api from "../apiConfig.json";

export default class WorkspaceService {
    _isLoading = false;

    get isLoading() { return this._isLoading; }
    set isLoading(v) { this._isLoading = !!v; }

    async ajax(url, method, body){
        const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        return await res.json();
    }

    async list(params = {}){
        const url = new URL(`${api.ApiConfig.main}/bb-workspace/api/workspace`);
        if (params.q) url.searchParams.set('q', String(params.q));
        return await this.ajax(url.toString(), 'GET');
    }

    async my(){
        const url = `${api.ApiConfig.main}/bb-workspace/api/my`;
        return await this.ajax(url, 'GET');
    }

    async listChats(workspaceId){
        const url = new URL(`${api.ApiConfig.main}/bb-workspace/api/workspace/chats`);
        url.searchParams.set('id', String(workspaceId));
        return await this.ajax(url.toString(), 'GET');
    }

    async get(id){
        const url = new URL(`${api.ApiConfig.main}/bb-workspace/api/workspace/get`);
        url.searchParams.set('id', String(id));
        return await this.ajax(url.toString(), 'GET');
    }

    async create(payload){
        const url = `${api.ApiConfig.main}/bb-workspace/api/workspace/create`;
        return await this.ajax(url, 'POST', payload);
    }

    async update(payload){
        const url = `${api.ApiConfig.main}/bb-workspace/api/workspace/update`;
        return await this.ajax(url, 'POST', payload);
    }

    async remove(id){
        const url = `${api.ApiConfig.main}/bb-workspace/api/workspace/delete`;
        return await this.ajax(url, 'POST', { id });
    }

    async assignUsers(id, users){
        const url = `${api.ApiConfig.main}/bb-workspace/api/workspace/assign-users`;
        return await this.ajax(url, 'POST', { id, users });
    }

    async assignModels(id, models){
        const url = `${api.ApiConfig.main}/bb-workspace/api/workspace/assign-models`;
        return await this.ajax(url, 'POST', { id, models });
    }

    async createWorkspaceChat(workspaceId, title = 'thread'){
        const url = `${api.ApiConfig.main}/bb-workspace/api/workspace/chat/create`;
        return await this.ajax(url, 'POST', { workspace_id: workspaceId, title });
    }
}


