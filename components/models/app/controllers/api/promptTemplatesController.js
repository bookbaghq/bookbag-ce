const master = require('mastercontroller');

class promptTemplatesController {
    constructor(req) {
        this._currentUser = req.authService.currentUser(req.request, req.userContext);
        this._modelContext = req.modelContext;
    }

    async list(obj) {
        try {
            const list = this._modelContext.PromptTemplates.toList();
            const promptTemplatesVM = require(`${master.root}/components/models/app/vm/promptTemplates`);
            const mapped = obj._mapper({ "promptTemplates": { templates: list } }, promptTemplatesVM);
            return this.returnJson({ success: true, promptTemplates: mapped?.promptTemplates || [] });
        } catch (error) {
            return this.returnJson({ success:false, error: error.message });
        }
    }

    returnJson(obj) { return obj; }
}

module.exports = promptTemplatesController;
