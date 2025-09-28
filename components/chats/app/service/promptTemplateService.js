/**
 * PromptTemplateService (simplified)
 * - Lightweight renderer for per-model prompt templates stored in DB (model.prompt_template)
 * - Supports sections {{#system}}...{{/system}} and {{#history}}...{{/history}}
 * - Supports conditionals {{#isUser}}...{{/isUser}} and {{#isAssistant}}...{{/isAssistant}} inside history block
 * - Supports placeholders {{system}}, {{user}}, {{role}}, {{content}}
 */
class PromptTemplateService {
    constructor() {}

    render(template, context) {
        if (typeof template !== 'string') return '';
        const safeTemplate = template;

        // History loop
        let rendered = safeTemplate.replace(/{{#history}}([\s\S]*?){{\/history}}/g, (_m, block) => {
            const history = Array.isArray(context.history) ? context.history : [];
            return history.map(h => {
                let out = block;
                out = out.replace(/{{#isUser}}([\s\S]*?){{\/isUser}}/g, h.role === 'user' ? '$1' : '');
                out = out.replace(/{{#isAssistant}}([\s\S]*?){{\/isAssistant}}/g, h.role === 'assistant' ? '$1' : '');
                out = out.replace(/{{role}}/g, h.role || '');
                out = out.replace(/{{content}}/g, h.content || '');
                return out;
            }).join('');
        });

        // System conditional section
        rendered = rendered.replace(/{{#system}}([\s\S]*?){{\/system}}/g, context.system ? '$1' : '');

        // Simple replacements
        rendered = rendered.replace(/{{system}}/g, context.system || '');
        rendered = rendered.replace(/{{user}}/g, context.user || '');

        return rendered;
    }

    /**
     * Build template context from message history.
     * - system: concatenated system messages (if any)
     * - history: all messages except system and the latest user
     * - user: latest user message content
     */
    buildContext(messageHistory, systemPromptOverride) {
        const messages = Array.isArray(messageHistory) ? messageHistory.slice() : [];
        // Use explicit system prompt if provided; otherwise no system section
        const system = typeof systemPromptOverride === 'string' && systemPromptOverride.trim().length > 0
            ? systemPromptOverride
            : '';

        // Find latest user message index
        let lastUserIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if ((messages[i].role || '').toLowerCase() === 'user') { lastUserIndex = i; break; }
        }
        const user = lastUserIndex >= 0 ? String(messages[lastUserIndex].content || '') : '';

        // Build history excluding system and the latest user
        const history = messages
            .filter((m, idx) => idx !== lastUserIndex && (m.role || '').toLowerCase() !== 'system')
            .map(m => ({
                role: (m.role || '').toLowerCase(),
                content: String(m.content || ''),
                isUser: (m.role || '').toLowerCase() === 'user',
                isAssistant: (m.role || '').toLowerCase() === 'assistant'
            }));

        return { system, history, user };
    }

    /**
     * Attempt to render a template that yields OpenAI-style JSON chat messages.
     * If parsing fails, fall back to building messages array from context directly.
     */
    renderToOpenAIMessages(template, messageHistory, systemPrompt) {
        const ctx = this.buildContext(messageHistory, systemPrompt);
        const rendered = (this.render(template, ctx) || '').trim();

        // Try to parse any {"role":"...","content":"..."} objects in the output
        const objects = [];
        const regex = /\{[^{}]*"role"\s*:\s*"([^"]+)"[^{}]*"content"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}/g;
        let match;
        while ((match = regex.exec(rendered)) !== null) {
            const role = (match[1] || '').toLowerCase();
            const raw = match[2] || '';
            // Basic unescape for \\ and \"
            const content = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            if (role === 'system' || role === 'user' || role === 'assistant') {
                objects.push({ role, content });
            }
        }
        if (objects.length > 0) {
            return objects;
        }

        // Fallback: construct messages directly from context
        const msgs = [];
        if (ctx.system) msgs.push({ role: 'system', content: ctx.system });
        for (const h of ctx.history) {
            if (h.role === 'user' || h.role === 'assistant') {
                msgs.push({ role: h.role, content: h.content });
            }
        }
        if (ctx.user) msgs.push({ role: 'user', content: ctx.user });
        return msgs;
    }
}

module.exports = new PromptTemplateService();