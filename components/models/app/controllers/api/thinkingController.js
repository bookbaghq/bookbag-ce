const master = require('mastercontroller');

class thinkingController {

    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._modelContext = req.modelContext;
    }

    returnJson(obj) { return obj; }

    async list(obj) {
        try {
            if (obj.request && obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Authorization',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const modelId = parseInt(obj?.params?.query?.model_id || obj?.params?.model_id || 0, 10);
            if (!Number.isFinite(modelId) || modelId <= 0) {
                return this.returnJson({ success: false, error: 'model_id is required' });
            }

            const list = this._modelContext.StartThinkingStrings
                .where(r => r.model_id == $$, modelId)
                .orderBy(r => r.id)
                .toList();

            const items = list.map(r => ({ id: r.id, start_word: r.start_word || '', end_word: r.end_word || '' }));
            return this.returnJson({ success: true, model_id: modelId, items });
        } catch (e) {
            return this.returnJson({ success: false, error: e.message });
        }
    }

    async add(obj) {
        try {
            if (obj.request && obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Authorization',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const f = obj?.params?.formData || obj?.params || {};
            const modelId = parseInt(f.model_id, 10);
            const startWord = (f.start_word || f.startWord || '').toString();
            const endWord = (f.end_word || f.endWord || '').toString();

            if (!Number.isFinite(modelId) || modelId <= 0) return this.returnJson({ success: false, error: 'model_id is required' });
            if (!endWord || endWord.trim().length === 0) return this.returnJson({ success: false, error: 'end_word is required' });

            const entityDef = require(`${master.root}/components/models/app/models/startThinkingStrings`);
            const rec = new entityDef();
            rec.Model = modelId;
            rec.start_word = startWord || '';
            rec.end_word = endWord.trim();
            rec.created_at = Date.now().toString();
            rec.updated_at = Date.now().toString();

            this._modelContext.StartThinkingStrings.add(rec);
            this._modelContext.saveChanges();

            return this.returnJson({ success: true, item: { id: rec.id, start_word: rec.start_word || '', end_word: rec.end_word } });
        } catch (e) {
            return this.returnJson({ success: false, error: e.message });
        }
    }

    async delete(obj) {
        try {
            if (obj.request && obj.request.method === 'OPTIONS') {
                obj.response.writeHead(200, {
                    'Access-Control-Allow-Origin': obj.request.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Authorization',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                });
                obj.response.end();
                return;
            }

            const f = obj?.params?.formData || obj?.params || {};
            const id = parseInt(f.id, 10);
            if (!Number.isFinite(id) || id <= 0) return this.returnJson({ success: false, error: 'id is required' });

            const rec = this._modelContext.StartThinkingStrings.where(r => r.id == $$, id).single();
            if (!rec) return this.returnJson({ success: false, error: 'Record not found' });

            this._modelContext.StartThinkingStrings.remove(rec);
            this._modelContext.saveChanges();

            return this.returnJson({ success: true, id });
        } catch (e) {
            return this.returnJson({ success: false, error: e.message });
        }
    }
}

module.exports = thinkingController;


