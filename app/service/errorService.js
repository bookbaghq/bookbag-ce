class ErrorService {
    normalizeProviderError(rawBody, status = null, provider = null) {
        let message = '';
        let code = null;
        let type = null;
        let details = null;
        try {
            const obj = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
            if (obj && obj.error) {
                message = obj.error.message || '';
                code = obj.error.code || null;
                type = obj.error.type || null;
                details = obj.error;
            } else {
                details = obj;
                message = (typeof rawBody === 'string') ? rawBody : JSON.stringify(obj);
            }
        } catch (_) {
            message = typeof rawBody === 'string' ? rawBody : String(rawBody);
            details = rawBody;
        }
        return {
            provider: provider || 'provider',
            status: status,
            code,
            type,
            message,
            details
        };
    }

    buildStreamErrorPayload(err, modelName = null) {
        const payload = {
            type: 'error',
            error: err?.message || 'Unknown error',
            model: modelName || null
        };
        if (err && typeof err === 'object') {
            if (err.status) payload.status = err.status;
            if (err.code) payload.code = err.code;
            if (err.type) payload.errorType = err.type;
            if (err.provider) payload.provider = err.provider;
            if (err.details) payload.details = err.details;
            if (err.providerError) payload.providerError = err.providerError;
        }
        return payload;
    }

    sendStreamingError(streamingService, res, err, modelName = null) {
        const payload = this.buildStreamErrorPayload(err, modelName);
        return streamingService.sendEvent(res, payload);
    }
}

module.exports = new ErrorService();



